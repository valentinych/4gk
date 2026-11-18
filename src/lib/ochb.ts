import { ratingChgkResultsQuery } from "./chgk-tournament-results";
import { db } from "./db";

export const OCHB_EVENT_ID = "ochb-2026";
export const OCHB_PATH = "/ochb";
export const OCHB_RATING_TOURNAMENT_ID = 14496;
export const OCHB_CHANNEL_URL = "https://t.me/nvrmr_bcn";
export const OCHB_DATE_LABEL = "20–22 ноября 2026";
export const OCHB_REGISTRATION_URL = "https://forms.gle/64ZLtBEfer1JxJWw7";

/** Haza broadcast for the ЧГК tile on /ochb. */
export const OCHB_HAZA_BROADCAST_ID = 684;
export const OCHB_HAZA_BROADCAST_URL = `https://www.haza.online/broadcast/${OCHB_HAZA_BROADCAST_ID}`;
export const OCHB_CHGK_TILE_TITLE = "Что? Где? Когда?";

/**
 * «Витрина» tab of the current team list (t.me/nvrmr_bcn/60).
 * The share link has no gid; export?format=csv&gid=0 returns HTTP 400.
 * gid 582300771 is the only tab and is the export that returns teams.
 */
export const OCHB_TEAMS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1R1gdkozkB5mXLardOftR6KlNhheWMdjDS2F-7q8yfOs/edit?gid=582300771";

/** From https://t.me/nvrmr_bcn/60. The team list itself is /ochb/participants. */
export const OCHB_LINKS = [
  {
    label: "Форма регистрации",
    href: OCHB_REGISTRATION_URL,
  },
  {
    label: "Пост для поиска легионеров и команд",
    href: "https://t.me/nvrmr_bcn/56",
  },
  {
    label: "Телеграм-канал",
    href: OCHB_CHANNEL_URL,
  },
] as const;

/** rating.chgk.info tournament 14496: tours 1–6, 15 questions each. */
export const OCHB_TOURS_LABEL = "6 туров по 15 вопросов";

/** rating.chgk.info orgcommittee, patronymics dropped. */
export const OCHB_ORG_COMMITTEE = [
  "Чулпан Урасина",
  "Ольга Машковцева",
  "Сергей Никольский",
] as const;

/** rating.chgk.info editors, API order. */
export const OCHB_EDITORS = [
  "Тарас Вахрив",
  "Александр Ермишкин",
  "Ксения Шагал",
  "Эдуард Шагал",
  "Алексей Шередега",
  "Александр Мерзликин",
  "Дмитрий Стальнухин",
  "Фёдор Журавлёв",
  "Филипп Тучак",
] as const;

export interface OchbScheduleItem {
  time: string;
  title: string;
}

export interface OchbScheduleDay {
  heading: string;
  items: OchbScheduleItem[];
}

/** Program from the festival announcement. Wording and times kept as published. */
export const OCHB_SCHEDULE: OchbScheduleDay[] = [
  {
    heading: "ПЯТНИЦА (20 ноября)",
    items: [
      {
        time: "20:00–22:30",
        title: "квиз «Вопроситос». Подробности скоро",
      },
    ],
  },
  {
    heading: "СУББОТА (21 ноября)",
    items: [
      { time: "11:00–11:30", title: "прибытие и регистрация" },
      { time: "11:30–12:30", title: "командная «Своя игра» (темы 1–10)" },
      { time: "12:30–12:45", title: "перерыв" },
      { time: "12:45–13:35", title: "ЧГК, первый тур" },
      { time: "13:35–13:50", title: "перерыв" },
      { time: "13:50–14:40", title: "ЧГК, второй тур" },
      { time: "14:40–14:55", title: "перерыв" },
      { time: "14:55–15:45", title: "ЧГК, третий тур" },
      { time: "15:45–18:00", title: "обед и свободное время" },
      { time: "18:00–20:30", title: "чёрное ЧГК" },
      { time: "20:30–20:45", title: "выход из зала" },
    ],
  },
  {
    heading: "ВОСКРЕСЕНЬЕ (22 ноября)",
    items: [
      { time: "10:00–10:15", title: "прибытие участников" },
      { time: "10:15–11:15", title: "командная «Своя игра» (темы 11–20)" },
      { time: "11:15–11:30", title: "перерыв" },
      { time: "11:30–12:20", title: "ЧГК, четвертый тур" },
      { time: "12:20–12:35", title: "перерыв" },
      { time: "12:35–13:25", title: "ЧГК, пятый тур" },
      { time: "13:25–13:40", title: "перерыв" },
      { time: "13:40–14:30", title: "ЧГК, шестой тур" },
      { time: "14:30–15:00", title: "апелляции" },
      { time: "15:00–15:30", title: "перестрелка (при необходимости)" },
      { time: "15:30–16:00", title: "награждение и закрытие фестиваля" },
    ],
  },
];

export interface OchbLandingTile {
  slug: string;
  emoji: string;
  title: string;
  href: string;
  external?: boolean;
}

export const OCHB_TILES: OchbLandingTile[] = [
  {
    slug: "participants",
    emoji: "👥",
    title: "Участники",
    href: "/ochb/participants",
  },
  {
    slug: "schedule",
    emoji: "🗓️",
    title: "Расписание",
    href: "/ochb/schedule",
  },
  {
    slug: "channel",
    emoji: "📣",
    title: "Телеграм-канал",
    href: OCHB_CHANNEL_URL,
    external: true,
  },
  {
    slug: "results",
    emoji: "📊",
    title: "Результаты рейтинга",
    href: "/ochb/results",
  },
  {
    slug: "results-quiz",
    emoji: "🎲",
    title: "Квиз «Вопроситос»",
    href: "/ochb/results-quiz",
  },
  {
    slug: "results-si",
    emoji: "🎯",
    title: "Результаты Своей игры",
    href: "/ochb/results-si",
  },
  {
    slug: "results-black",
    emoji: "😈",
    title: "Чёрное ЧГК",
    href: "/ochb/results-black",
  },
  {
    slug: "roster",
    emoji: "📋",
    title: "Подать состав",
    href: "/ochb/roster",
  },
  {
    slug: "controversial",
    emoji: "💬",
    title: "Спорные",
    href: "/ochb/controversial",
  },
  {
    slug: "appeals",
    emoji: "⚖️",
    title: "Апелляции",
    href: "/ochb/appeals",
  },
  {
    slug: "registration",
    emoji: "📝",
    title: "Форма регистрации",
    href: OCHB_REGISTRATION_URL,
    external: true,
  },
];

/** Landing tiles, including the Haza ЧГК broadcast. Rating stays a separate tile. */
export function ochbStaticTiles(): OchbLandingTile[] {
  const chgk: OchbLandingTile = {
    slug: "chgk",
    emoji: "❓",
    title: OCHB_CHGK_TILE_TITLE,
    href: OCHB_HAZA_BROADCAST_URL,
    external: true,
  };
  const tiles = OCHB_TILES.map((tile) => ({ ...tile }));
  const resultsAt = tiles.findIndex((tile) => tile.slug === "results");
  if (resultsAt < 0) return [...tiles, chgk];
  tiles.splice(resultsAt, 0, chgk);
  return tiles;
}

export function ochbRatingPublicUrl(
  tournamentId: number = OCHB_RATING_TOURNAMENT_ID,
): string {
  return `https://rating.chgk.info/tournament/${tournamentId}`;
}

export function isOchbEvent(eventId: string): boolean {
  return eventId === OCHB_EVENT_ID;
}

/** Synthetic team for page admins who are not on a submitted roster. */
export const OCHB_ADMIN_TEAM_CHGK_ID = 0;

/** Roster team wins. Page admin without a roster submits as team 0. The client team is ignored. */
export function resolveOchbSubmitTeamChgkId(opts: {
  isPageAdmin: boolean;
  rosterTeamChgkId: number | null;
}):
  | { ok: true; teamChgkId: number }
  | { ok: false; error: string; status: 403 } {
  if (opts.rosterTeamChgkId != null) {
    return { ok: true, teamChgkId: opts.rosterTeamChgkId };
  }
  if (opts.isPageAdmin) {
    return { ok: true, teamChgkId: OCHB_ADMIN_TEAM_CHGK_ID };
  }
  return { ok: false, error: "not-in-roster", status: 403 };
}

export const OCHB = {
  id: OCHB_EVENT_ID,
  title: "ОЧБ-2026",
  longTitle: "I Открытый Чемпионат Барселоны",
  city: "Барселона",
  startDate: new Date(Date.UTC(2026, 10, 20)),
  endDate: new Date(Date.UTC(2026, 10, 22)),
  description:
    "I Открытый Чемпионат Барселоны. 20–22 ноября 2026, Барселона.",
  ratingUrl: ochbRatingPublicUrl(),
} as const;

export interface OchbTeam {
  number: number;
  name: string;
  city: string;
  /** rating.chgk.info id. Null when there is no unique exact-name match. */
  teamChgkId: number | null;
}

/**
 * Rating id of «Polish Space Marines» (sheet short name «PSM»).
 * The participants list uses this name and keeps id 77174.
 */
const OCHB_PSM_TEAM_CHGK_ID = 77174;

/**
 * Same-slot lineup stored under the previous id. Moved onto the rating id
 * so the «Состав» check stays on that team. Only ochb-2026, and only when
 * the new id has no roster yet.
 */
const OCHB_ROSTER_ID_MOVES: ReadonlyArray<{ from: number; to: number }> = [
  { from: -24, to: 109620 },
  { from: -25, to: 100276 },
  { from: 99764, to: 109623 },
  { from: -32, to: 109615 },
];

/**
 * Snapshot of the «Барса-КСИ» grid, 18 Nov 2026.
 * Workbook 1bLncFYCZ73ZQWM8pdMBCh0oQ91JaezKGxhfGYB36mYI, gid 0 (same sheet as SI).
 * Number is the «Бланк» column, name is «Player». That grid has no city;
 * cities are kept from the previous list.
 * teamChgkId is the tournament 14496 id.
 * «Polish Space Marines» stays on 77174 (Krakow); the sheet still says «PSM».
 */
export const OCHB_TEAMS: readonly OchbTeam[] = [
  { number: 1, name: "Так тоже можно", city: "Барселона", teamChgkId: 102282 },
  { number: 2, name: "Кавалуния", city: "Барселона", teamChgkId: 95523 },
  { number: 3, name: "Слон разума", city: "Барселона", teamChgkId: 72693 },
  { number: 4, name: "Горизонт планирования", city: "Валенсия", teamChgkId: 108159 },
  { number: 5, name: "Jamon everybody", city: "Валенсия", teamChgkId: 108098 },
  { number: 6, name: "Manychat", city: "Барселона", teamChgkId: null },
  { number: 7, name: "ЖЗЛ", city: "Барселона", teamChgkId: 99902 },
  { number: 8, name: "Испанский стыд", city: "Gijon", teamChgkId: 107866 },
  { number: 9, name: "Белые риэлторы", city: "Валенсия", teamChgkId: 108161 },
  { number: 10, name: "Кринж без выходных", city: "Варшава", teamChgkId: 85064 },
  { number: 11, name: "На всякий мем", city: "Цюрих", teamChgkId: 79286 },
  { number: 12, name: "В гостях у Кафки", city: "Прага", teamChgkId: 65268 },
  { number: 13, name: "X-promt", city: "Рига", teamChgkId: 4032 },
  { number: 14, name: "Poupas et Loupas sans Frontières", city: "Мюнхен", teamChgkId: 72544 },
  { number: 15, name: "Олеги Литвы", city: "Сборная", teamChgkId: 80965 },
  { number: 16, name: "Приматы", city: "Сборная", teamChgkId: 26956 },
  { number: 17, name: "Пробковый ноктурлабиум", city: "Хельсинки", teamChgkId: 91946 },
  { number: 18, name: "Карт бланш", city: "Кишинёв", teamChgkId: 6178 },
  { number: 19, name: "Приемлемо", city: "Варшава", teamChgkId: 91852 },
  { number: 20, name: "GOL", city: "Одеса", teamChgkId: 67674 },
  { number: 21, name: "Ř", city: "Прага", teamChgkId: 105175 },
  { number: 22, name: "Вечер посудного дня", city: "Амстердам", teamChgkId: 106377 },
  { number: 23, name: "Коммуникативные неудачи", city: "Рига", teamChgkId: 4789 },
  { number: 24, name: "Левый глаз Дэвида Боуи", city: "сборная", teamChgkId: 109620 },
  { number: 25, name: "Lorem United", city: "Одесса", teamChgkId: 100276 },
  { number: 26, name: "Или Вася", city: "Прага", teamChgkId: 86290 },
  { number: 27, name: "Паюсная икра висконсинского осетра", city: "Сборная", teamChgkId: 109623 },
  { number: 28, name: "Византийский консенсус", city: "сборная", teamChgkId: 79497 },
  { number: 29, name: "Polish Space Marines", city: "Krakow", teamChgkId: OCHB_PSM_TEAM_CHGK_ID },
  { number: 30, name: "Самая большая лягушка", city: "Варшава", teamChgkId: 86769 },
  { number: 31, name: "Savage", city: "Кишинев", teamChgkId: 42558 },
  { number: 32, name: "Тыквенные латы", city: "Тель Авив", teamChgkId: 109615 },
  { number: 33, name: "План Каплан", city: "Франкфурт-на-Майне", teamChgkId: 91497 },
  { number: 34, name: "РПМ", city: "Кишинев", teamChgkId: 105248 },
  { number: 35, name: "Всё дело в перце", city: "Хайфа", teamChgkId: 3269 },
  { number: 36, name: "Пляжники", city: "Нью-Йорк", teamChgkId: 107727 },
  { number: 37, name: "Соборная Святого семейства", city: "", teamChgkId: null },
];

/** EventTeam key. Teams without a rating id use a stable negative number. */
export function ochbEventTeamChgkId(team: Pick<OchbTeam, "number" | "teamChgkId">): number {
  return team.teamChgkId != null && team.teamChgkId > 0 ? team.teamChgkId : -team.number;
}

function normOchbName(s: string): string {
  return s
    .replace(/ё/gi, "е")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru");
}

function applyRatingNames(teams: OchbTeam[], rating: OchbParticipant[]): OchbTeam[] {
  const byName = new Map(rating.map((t) => [normOchbName(t.name), t]));
  return teams.map((team) => {
    if (team.number === 29 || team.teamChgkId === OCHB_PSM_TEAM_CHGK_ID) return team;
    const hit = byName.get(normOchbName(team.name));
    if (!hit || hit.teamChgkId === OCHB_PSM_TEAM_CHGK_ID) return team;
    return {
      ...team,
      name: hit.name,
      city: hit.city || team.city,
      teamChgkId: hit.teamChgkId,
    };
  });
}

/**
 * Static list, with official rating names overlaid when tournament 14496 has teams.
 * The Google sheet is not fetched here: it also contains representative emails,
 * and a server render would ship that file in the page payload.
 */
export async function loadOchbTeams(): Promise<OchbTeam[]> {
  const teams: OchbTeam[] = [...OCHB_TEAMS];
  try {
    const rating = await fetchOchbParticipants();
    if (rating.ok && rating.teams.length > 0) {
      return applyRatingNames(teams, rating.teams);
    }
  } catch {
    /* rating API is optional */
  }
  return teams;
}

async function seedOchbTeams(teams: readonly OchbTeam[]) {
  await db.$transaction(
    teams.map((team) => {
      const teamChgkId = ochbEventTeamChgkId(team);
      return db.eventTeam.upsert({
        where: {
          eventId_teamChgkId: { eventId: OCHB_EVENT_ID, teamChgkId },
        },
        create: {
          eventId: OCHB_EVENT_ID,
          teamChgkId,
          teamName: team.name,
          displayName: team.name,
          city: team.city,
        },
        update: {
          teamName: team.name,
          displayName: team.name,
          city: team.city,
        },
      });
    }),
  );
}

/**
 * Point an ochb-2026 lineup at the rating id for the same slot.
 * A roster already stored on the new id is left in place, and the old row stays.
 */
async function moveOchbRosterIds() {
  for (const { from, to } of OCHB_ROSTER_ID_MOVES) {
    const [fromRows, toRows] = await Promise.all([
      db.teamRoster.findMany({
        where: { eventId: OCHB_EVENT_ID, teamChgkId: from },
        select: { id: true },
      }),
      db.teamRoster.findMany({
        where: { eventId: OCHB_EVENT_ID, teamChgkId: to },
        select: { id: true },
      }),
    ]);
    if (fromRows.length === 0) continue;
    if (toRows.length > 0) {
      console.warn(
        `ochb roster id clash: ${from} → ${to} skipped (${fromRows.length} kept, ${toRows.length} already on the new id)`,
      );
      continue;
    }
    const moved = await db.teamRoster.updateMany({
      where: { eventId: OCHB_EVENT_ID, teamChgkId: from },
      data: { teamChgkId: to },
    });
    console.info(`ochb roster id move: ${from} → ${to} (${moved.count})`);
  }
}

/** Calendar row plus EventTeam rows. Same display-name overwrite as Pražma on reseed. */
export async function ensureOchbEvent() {
  const existing = await db.calendarEvent.findUnique({
    where: { id: OCHB_EVENT_ID },
  });

  const event =
    existing ??
    (await db.calendarEvent.create({
      data: {
        id: OCHB_EVENT_ID,
        title: `${OCHB.longTitle} (${OCHB.title})`,
        type: "multi-day",
        startDate: OCHB.startDate,
        endDate: OCHB.endDate,
        city: OCHB.city,
        description: OCHB.description,
        ratingUrl: OCHB.ratingUrl,
        mediaLink: OCHB_CHANNEL_URL,
        mediaLinkLabel: "Канал ОЧБ",
      },
    }));

  await seedOchbTeams(OCHB_TEAMS);
  await moveOchbRosterIds();
  const keepIds = OCHB_TEAMS.map((team) => ochbEventTeamChgkId(team));
  await db.eventTeam.updateMany({
    where: {
      eventId: OCHB_EVENT_ID,
      withdrawnAt: null,
      teamChgkId: { notIn: keepIds },
    },
    data: { withdrawnAt: new Date() },
  });

  return event;
}

function numberForStorageId(storageId: number): number {
  const known = OCHB_TEAMS.find((t) => ochbEventTeamChgkId(t) === storageId);
  if (known) return known.number;
  return storageId < 0 ? -storageId : storageId;
}

/** Saved teams, including ones with no rating id. Empty when the event has not been seeded. */
export async function listOchbParticipants(): Promise<OchbTeam[]> {
  const rows = await db.eventTeam.findMany({
    where: { eventId: OCHB_EVENT_ID, withdrawnAt: null },
    select: { teamChgkId: true, teamName: true, displayName: true, city: true },
  });
  const teams = rows.map((r) => ({
    number: numberForStorageId(r.teamChgkId),
    name: (r.displayName || r.teamName).trim(),
    city: r.city?.trim() || "",
    teamChgkId: r.teamChgkId > 0 ? r.teamChgkId : null,
  }));
  teams.sort((a, b) => a.number - b.number || a.name.localeCompare(b.name, "ru"));
  return teams;
}

export interface OchbParticipant {
  number: number;
  name: string;
  city: string;
  teamChgkId: number;
}

export type OchbParticipantsFetch =
  | { ok: true; teams: OchbParticipant[] }
  | { ok: false };

interface RatingResultRow {
  position: number;
  team: { id: number; name?: string; town?: { name?: string } };
  current?: { name?: string; town?: { name?: string } };
}

/** GET /tournaments/14496/results. Failure is distinct from an empty list. */
export async function fetchOchbParticipants(): Promise<OchbParticipantsFetch> {
  try {
    const res = await fetch(
      `https://api.rating.chgk.info/tournaments/${OCHB_RATING_TOURNAMENT_ID}/results?${ratingChgkResultsQuery(0)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return { ok: false };
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) return { ok: false };

    const teams = rows.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const r = row as RatingResultRow;
      if (typeof r.position !== "number" || r.position === 9999) return [];
      if (!r.team || typeof r.team.id !== "number") return [];
      const name = (r.current?.name || r.team.name || "").trim();
      const city = (r.current?.town?.name || r.team.town?.name || "").trim();
      return [{ position: r.position, name, city, teamChgkId: r.team.id }];
    });

    const allZero = teams.length > 0 && teams.every((t) => t.position === 0);
    teams.sort((a, b) => {
      if (!allZero && a.position !== b.position) return a.position - b.position;
      return a.name.localeCompare(b.name, "ru");
    });

    return {
      ok: true,
      teams: teams.map((t, i) => ({
        number: allZero ? i + 1 : t.position,
        name: t.name,
        city: t.city,
        teamChgkId: t.teamChgkId,
      })),
    };
  } catch {
    return { ok: false };
  }
}
