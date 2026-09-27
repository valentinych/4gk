import { db } from "./db";
import {
  fetchSheetTable,
  parseGoogleSheetsUrl,
  type SheetTableData,
} from "./google-sheets";

export const PRAZMA_EVENT_ID = "prazma-2026";
export const PRAZMA_PATH = "/prazma";
export const PRAZMA_BOARD_HREF = "/prague";
export const PRAZMA_RATING_TOURNAMENT_ID = 13490;
export const PRAZMA_DATE_LABEL = "2 мая 2026";

const PRAZMA_SHEETS_ID = "1ioyaF-IHU6dyzVpgS6LtxfDegn-gMw8ZCCVVCOJkR7c";
const PRAZMA_TEAMS_GID = "1848241624";
const PRAZMA_IDS_GID = "756828556";

export function prazmaRatingPublicUrl(
  tournamentId: number = PRAZMA_RATING_TOURNAMENT_ID,
): string {
  return `https://rating.chgk.info/tournament/${tournamentId}`;
}

export function isPrazmaEvent(eventId: string): boolean {
  return eventId === PRAZMA_EVENT_ID;
}

export const PRAZMA = {
  id: PRAZMA_EVENT_ID,
  title: "Pražma 2026",
  longTitle: "Пражский полумарафон: 15 часов ЧГК",
  heading: "Pražma 2026. Пражский полумарафон",
  city: "Прага",
  startDate: new Date(Date.UTC(2026, 4, 2)),
  description:
    "Пражский полумарафон: 15 часов ЧГК. 2 мая 2026, Прага.",
  ratingUrl: prazmaRatingPublicUrl(),
} as const;

export interface PrazmaLandingTile {
  slug: string;
  emoji: string;
  title: string;
  href: string;
  external?: boolean;
}

export const PRAZMA_TILES: PrazmaLandingTile[] = [
  {
    slug: "participants",
    emoji: "👥",
    title: "Участники",
    href: "/prazma/participants",
  },
  {
    slug: "results",
    emoji: "📊",
    title: "Табло результатов",
    href: PRAZMA_BOARD_HREF,
  },
  {
    slug: "results-rating",
    emoji: "🏆",
    title: "Результаты рейтинга",
    href: "/prazma/results",
  },
  {
    slug: "rating",
    emoji: "🔗",
    title: "rating.chgk.info",
    href: prazmaRatingPublicUrl(),
    external: true,
  },
];

export interface PrazmaImportedTeam {
  number: number;
  name: string;
  city: string;
  teamChgkId: number;
}

/** Teams 01–46 from the workbook, bound to rating.chgk.info IDs by exact name. */
export const PRAZMA_TEAMS: readonly PrazmaImportedTeam[] = [
  { number: 1, name: "Олеги Литвы", city: "Сборная", teamChgkId: 80965 },
  { number: 2, name: "Short & Sweet", city: "Сборная", teamChgkId: 105474 },
  { number: 3, name: "Сборная того или иного рода", city: "Рига", teamChgkId: 93821 },
  { number: 4, name: "с нами Б-г", city: "Варшава", teamChgkId: 87688 },
  { number: 5, name: "Коммуникативные неудачи", city: "Рига", teamChgkId: 4789 },
  { number: 6, name: "Mafia", city: "Krakow", teamChgkId: 86108 },
  { number: 7, name: "31-й пациент", city: "Рига", teamChgkId: 78405 },
  { number: 8, name: "Non-Sense", city: "Рига", teamChgkId: 5517 },
  { number: 9, name: "Шутка со смыслом", city: "Мюнхен", teamChgkId: 72474 },
  { number: 10, name: "Оранжевый вигвам", city: "Сборная", teamChgkId: 105856 },
  { number: 11, name: "Нетудыхатка", city: "Нюрнберг", teamChgkId: 89891 },
  { number: 12, name: "Цифра 3", city: "Варшава", teamChgkId: 101287 },
  { number: 13, name: "Savage", city: "Кишинев", teamChgkId: 42558 },
  {
    number: 14,
    name: "мой коронный рецепт гречки в микроволновке",
    city: "Берлин-Амстердам-София",
    teamChgkId: 90039,
  },
  { number: 15, name: "Два слова на букву К", city: "Мёрфельден-Вальдорф", teamChgkId: 55486 },
  { number: 16, name: "Neglinka", city: "Сборная", teamChgkId: 6048 },
  { number: 17, name: "Конский Троян", city: "Мюнхен", teamChgkId: 92287 },
  { number: 18, name: "Весло", city: "Вена", teamChgkId: 105954 },
  { number: 19, name: "Зелёный трамвай", city: "Кишинёв", teamChgkId: 405 },
  { number: 20, name: "На всякий случай", city: "Сборная", teamChgkId: 98728 },
  { number: 21, name: "Капибаристы", city: "Одесса", teamChgkId: 51996 },
  { number: 22, name: "Одинокие ковбои", city: "Сборная", teamChgkId: 99764 },
  { number: 23, name: "Летучий Голландец", city: "Сборная", teamChgkId: 106060 },
  { number: 24, name: "Tamos VIP", city: "Алматы", teamChgkId: 70337 },
  { number: 25, name: "Бар и бал", city: "Лондон", teamChgkId: 52101 },
  { number: 26, name: "Рыцари, говорящие нони", city: "Сборная", teamChgkId: 105168 },
  { number: 27, name: "Пробковый ноктурлабиум", city: "Хельсинки", teamChgkId: 91946 },
  { number: 28, name: "Йота Киля", city: "Дрезден", teamChgkId: 54151 },
  { number: 29, name: "Прыг-Скок", city: "Мюнхен", teamChgkId: 72544 },
  { number: 30, name: "Центровые", city: "Рига", teamChgkId: 4174 },
  { number: 31, name: "X-promt", city: "Рига", teamChgkId: 4032 },
  { number: 32, name: "Странные агенты", city: "Берлин", teamChgkId: 85037 },
  { number: 33, name: "Пассажиры LTG", city: "Вильнюс", teamChgkId: 89616 },
  { number: 34, name: "Сцилла", city: "Берлин", teamChgkId: 68786 },
  { number: 35, name: "Так тоже можно", city: "Барселона", teamChgkId: 102282 },
  { number: 36, name: "Панические Атаки", city: "Таллинн", teamChgkId: 65510 },
  { number: 37, name: "Brain art", city: "Алматы", teamChgkId: 27684 },
  { number: 38, name: "Команда Ř", city: "Прага", teamChgkId: 105175 },
  { number: 39, name: "Море по колено", city: "Прага", teamChgkId: 65808 },
  { number: 40, name: "В гостях у Кафки", city: "Прага", teamChgkId: 65268 },
  { number: 41, name: "Nevím", city: "Прага", teamChgkId: 70149 },
  { number: 42, name: "или вася", city: "Прага", teamChgkId: 86290 },
  { number: 43, name: "Хмели сумели", city: "Прага", teamChgkId: 65703 },
  { number: 44, name: "Bedla jedla", city: "Прага", teamChgkId: 71710 },
  { number: 45, name: "Кружок Экстравертов", city: "Прага", teamChgkId: 78786 },
  { number: 46, name: "Как-то так", city: "Прага", teamChgkId: 4130 },
];

function colIndex(headers: string[], ...needles: string[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const needle of needles) {
    const i = lower.findIndex((h) => h.includes(needle));
    if (i >= 0) return i;
  }
  return -1;
}

function cell(row: string[], idx: number): string {
  return (idx >= 0 ? row[idx] ?? "" : "").trim();
}

function normName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
}

export function matchPrazmaTeamsToIds(
  teamsTable: SheetTableData,
  idsTable: SheetTableData,
): PrazmaImportedTeam[] {
  const tNum = colIndex(teamsTable.headers, "№", "no", "номер");
  const tName = colIndex(teamsTable.headers, "команда");
  const tCity = colIndex(teamsTable.headers, "город");
  const iName = colIndex(idsTable.headers, "название");
  const iId = colIndex(idsTable.headers, "id");
  const iCity = colIndex(idsTable.headers, "город");

  const idByName = new Map<string, { id: number; city: string }>();
  for (const row of idsTable.rows) {
    const name = cell(row, iName >= 0 ? iName : 1);
    const id = parseInt(cell(row, iId >= 0 ? iId : 4), 10);
    if (!name || !Number.isFinite(id) || id <= 0) continue;
    const key = normName(name);
    if (!idByName.has(key)) {
      idByName.set(key, { id, city: cell(row, iCity >= 0 ? iCity : 3) });
    }
  }

  const out: PrazmaImportedTeam[] = [];
  for (const row of teamsTable.rows) {
    const number = parseInt(cell(row, tNum >= 0 ? tNum : 0), 10);
    const name = cell(row, tName >= 0 ? tName : 1);
    if (!name || !Number.isFinite(number) || number < 1 || number > 46) continue;
    const hit = idByName.get(normName(name));
    if (!hit) continue;
    out.push({
      number,
      name,
      city: cell(row, tCity >= 0 ? tCity : 3) || hit.city,
      teamChgkId: hit.id,
    });
  }
  out.sort((a, b) => a.number - b.number);
  return out;
}

async function fetchPrazmaSheet(gid: string): Promise<SheetTableData> {
  const parsed = parseGoogleSheetsUrl(
    `https://docs.google.com/spreadsheets/d/${PRAZMA_SHEETS_ID}/edit?gid=${gid}`,
  );
  if (!parsed) throw new Error("Invalid Pražma sheet URL");
  return fetchSheetTable(parsed);
}

/** Live sheet if public; otherwise the imported seed. */
export async function loadPrazmaImportedTeams(): Promise<PrazmaImportedTeam[]> {
  try {
    const [teamsTable, idsTable] = await Promise.all([
      fetchPrazmaSheet(PRAZMA_TEAMS_GID),
      fetchPrazmaSheet(PRAZMA_IDS_GID),
    ]);
    const live = matchPrazmaTeamsToIds(teamsTable, idsTable);
    if (live.length > 0) return live;
  } catch {
    /* sheet is private in production — use seed */
  }
  return [...PRAZMA_TEAMS];
}

async function seedPrazmaTeams(teams: readonly PrazmaImportedTeam[]) {
  await db.$transaction(
    teams.map((team) =>
      db.eventTeam.upsert({
        where: {
          eventId_teamChgkId: {
            eventId: PRAZMA_EVENT_ID,
            teamChgkId: team.teamChgkId,
          },
        },
        create: {
          eventId: PRAZMA_EVENT_ID,
          teamChgkId: team.teamChgkId,
          teamName: team.name,
          displayName: team.name,
          city: team.city,
        },
        update: {
          teamName: team.name,
          displayName: team.name,
          city: team.city,
        },
      }),
    ),
  );
}

/** Idempotent — CalendarEvent + EventTeam rows with rating.chgk.info IDs. */
export async function ensurePrazmaEvent() {
  const existing = await db.calendarEvent.findUnique({
    where: { id: PRAZMA_EVENT_ID },
    include: { _count: { select: { eventTeams: true } } },
  });

  const event =
    existing ??
    (await db.calendarEvent.create({
      data: {
        id: PRAZMA_EVENT_ID,
        title: `${PRAZMA.longTitle} (${PRAZMA.title})`,
        type: "one-day",
        startDate: PRAZMA.startDate,
        city: PRAZMA.city,
        description: PRAZMA.description,
        ratingUrl: PRAZMA.ratingUrl,
      },
    }));

  if (!existing || existing._count.eventTeams < PRAZMA_TEAMS.length) {
    const teams = await loadPrazmaImportedTeams();
    await seedPrazmaTeams(teams.length > 0 ? teams : PRAZMA_TEAMS);
  }

  return event;
}

export async function listPrazmaParticipants(): Promise<PrazmaImportedTeam[]> {
  const rows = await db.eventTeam.findMany({
    where: { eventId: PRAZMA_EVENT_ID, withdrawnAt: null },
    select: { teamChgkId: true, teamName: true, displayName: true, city: true },
  });
  const numberById = new Map(PRAZMA_TEAMS.map((t) => [t.teamChgkId, t.number]));
  const teams = rows
    .filter((r) => r.teamChgkId > 0)
    .map((r) => ({
      number: numberById.get(r.teamChgkId) ?? r.teamChgkId,
      name: (r.displayName || r.teamName).trim(),
      city: r.city?.trim() || "",
      teamChgkId: r.teamChgkId,
    }));
  teams.sort((a, b) => a.number - b.number || a.name.localeCompare(b.name, "ru"));
  return teams;
}

export async function prazmaNamesByChgkId(): Promise<Map<number, string>> {
  const rows = await db.eventTeam.findMany({
    where: { eventId: PRAZMA_EVENT_ID, withdrawnAt: null, teamChgkId: { gt: 0 } },
    select: { teamChgkId: true, teamName: true, displayName: true },
  });
  const map = new Map<number, string>();
  for (const r of rows) {
    const name = (r.displayName || r.teamName).trim();
    if (name) map.set(r.teamChgkId, name);
  }
  return map;
}
