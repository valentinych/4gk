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
  const { teams, tours: toursMeta } = payload;
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
        team.number?.trim() ?? "",
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
