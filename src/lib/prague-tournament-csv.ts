/**
 * CSV формата tournament-tours (как в шаблоне Pražma): блоки по турам,
 * глобальная нумерация вопросов 1–235 по сегментам.
 */

export interface PragueCsvTeam {
  team: string;
  city: string;
  number: string;
  tours: { marks: (boolean | null)[] }[];
}

export interface PragueCsvPayload {
  teams: PragueCsvTeam[];
  tours: { questionCount: number }[];
}

/** Совпадает с tournament-tours-*.csv: тур × диапазон глобальных номеров вопросов. */
export const PRAGUE_TOURNAMENT_SEGMENTS = [
  { tourNum: 1, start: 1, end: 36 },
  { tourNum: 2, start: 37, end: 72 },
  { tourNum: 3, start: 73, end: 117 },
  { tourNum: 4, start: 118, end: 162 },
  { tourNum: 5, start: 163, end: 192 },
  { tourNum: 6, start: 193, end: 235 },
] as const;

/**
 * Официальные Team ID и порядок строк как в шаблоне tournament-tours (Pražma).
 * Номер в CSV всегда берётся отсюда, а не из поля number в таблице.
 */
export const PRAGUE_TOURNAMENT_TEMPLATE_ROWS: readonly {
  id: string;
  team: string;
  city: string;
}[] = [
  { id: "71710", team: "Bedla Jedla", city: "Прага" },
  { id: "70149", team: "Nevím", city: "Прага" },
  { id: "4032", team: "X-promt", city: "Рига" },
  { id: "65268", team: "В гостях у Кафки", city: "Прага" },
  { id: "105954", team: "Весло Открытий", city: "сборная" },
  { id: "86951", team: "Даша в Зоопарке", city: "Вена" },
  { id: "55486", team: "Два слова на букву К", city: "Мёрфельден-Вальдорф" },
  { id: "86290", team: "или вася", city: "Прага" },
  { id: "4130", team: "Как-то так", city: "Прага" },
  { id: "105175", team: "Команда Ř", city: "Прага" },
  { id: "106060", team: "Летучий Голландец", city: "сборная" },
  { id: "90039", team: "мртвы крт", city: "Берлин" },
  { id: "108122", team: "Невероятно выразительное кря", city: "сборная" },
  { id: "330", team: "Проти вiтру", city: "Дюссельдорф" },
  {
    id: "108117",
    team: "Риск встретить медведя в Татрах продолжает расти",
    city: "сборная",
  },
  { id: "86769", team: "Самая большая лягушка", city: "Варшава" },
  { id: "93821", team: "Сборная того или иного рода", city: "Рига" },
  { id: "85037", team: "Странные агенты", city: "Берлин" },
  { id: "65703", team: "Хмели сумели", city: "Прага" },
  { id: "86754", team: "Хы", city: "Мюнхен" },
  { id: "48303", team: "Человек-снежинка", city: "Таллинн" },
  { id: "87193", team: "Чилийские степные белки", city: "Нюрнберг" },
];

function normPart(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function teamCityKey(team: string, city: string): string {
  return `${normPart(team)}|${normPart(city)}`;
}

/** Team ID из шаблона по паре «название + город»; иначе номер из данных. */
export function templateTeamIdFor(team: PragueCsvTeam): string {
  const key = teamCityKey(team.team, team.city);
  const row = PRAGUE_TOURNAMENT_TEMPLATE_ROWS.find(
    (r) => teamCityKey(r.team, r.city) === key,
  );
  if (row) return row.id;
  return team.number?.trim() ?? "";
}

/** Сначала строки в порядке шаблона, затем команды, которых нет в шаблоне. */
export function orderTeamsLikeTemplate(teams: PragueCsvTeam[]): PragueCsvTeam[] {
  const byKey = new Map<string, PragueCsvTeam>();
  for (const t of teams) {
    byKey.set(teamCityKey(t.team, t.city), t);
  }
  const out: PragueCsvTeam[] = [];
  const used = new Set<string>();
  for (const row of PRAGUE_TOURNAMENT_TEMPLATE_ROWS) {
    const t = byKey.get(teamCityKey(row.team, row.city));
    if (t) {
      out.push(t);
      used.add(teamCityKey(t.team, t.city));
    }
  }
  for (const t of teams) {
    const k = teamCityKey(t.team, t.city);
    if (!used.has(k)) out.push(t);
  }
  return out;
}

function csvEscape(field: string): string {
  if (/[",\n\r]/.test(field)) return `"${field.replace(/"/g, '""')}"`;
  return field;
}

function csvRow(fields: string[]): string {
  return fields.map(csvEscape).join(",");
}

function markAtGlobalQuestion(
  team: PragueCsvTeam,
  toursMeta: { questionCount: number }[],
  globalQ: number,
): "0" | "1" {
  let g = globalQ;
  for (let ti = 0; ti < toursMeta.length; ti++) {
    const qc = toursMeta[ti].questionCount;
    if (g <= qc) {
      const v = team.tours[ti]?.marks[g - 1];
      return v === true ? "1" : "0";
    }
    g -= qc;
  }
  return "0";
}

/** Построить CSV целиком (без BOM — BOM добавляет route). */
export function buildPragueTournamentToursCsv(payload: PragueCsvPayload): string {
  const { teams: rawTeams, tours: toursMeta } = payload;
  const teams = orderTeamsLikeTemplate(rawTeams);
  const lines: string[] = [];

  for (let si = 0; si < PRAGUE_TOURNAMENT_SEGMENTS.length; si++) {
    const seg = PRAGUE_TOURNAMENT_SEGMENTS[si];
    const nCols = seg.end - seg.start + 1;
    const width = 4 + nCols;

    lines.push(csvRow(Array(width).fill("")));

    const headerFields = [
      "Team ID",
      "Название",
      "Город",
      "Тур",
      ...Array.from({ length: nCols }, (_, i) => String(seg.start + i)),
    ];
    lines.push(csvRow(headerFields));

    for (const team of teams) {
      const row: string[] = [
        templateTeamIdFor(team),
        team.team,
        team.city,
        String(seg.tourNum),
      ];
      for (let q = seg.start; q <= seg.end; q++) {
        row.push(markAtGlobalQuestion(team, toursMeta, q));
      }
      lines.push(csvRow(row));
    }
  }

  return lines.join("\r\n");
}
