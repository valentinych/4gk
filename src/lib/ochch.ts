import { db } from "./db";
import {
  PRAZMA_TEAMS,
  loadPrazmaImportedTeams,
  type PrazmaImportedTeam,
} from "./prazma";

export const OCHCH_EVENT_ID = "ochch-2026";
export const OCHCH_PATH = "/ochch";
export const OCHCH_RATING_TOURNAMENT_ID = 14219;
export const OCHCH_CHANNEL_URL = "https://t.me/o44praha";
export const OCHCH_DATE_LABEL = "3–4 октября 2026";

/** Live CHGK tablo (Pražma-style: one tab per tour, 7 × 15). */
export const OCHCH_CHGK_SHEET_ID = "1GdbaO82m_ROvZ6l0kLi6zKpFcHaCoA5Acwfg1D2FiZo";
export const OCHCH_CHGK_SHEET_URL = `https://docs.google.com/spreadsheets/d/${OCHCH_CHGK_SHEET_ID}/edit?usp=sharing`;
export const OCHCH_CHGK_TOURS: { name: string; gid: string }[] = [
  { name: "Тур 1", gid: "0" },
  { name: "Тур 2", gid: "1617803648" },
  { name: "Тур 3", gid: "1444833333" },
  { name: "Тур 4", gid: "514844789" },
  { name: "Тур 5", gid: "1048826253" },
  { name: "Тур 6", gid: "1755691667" },
  { name: "Тур 7", gid: "1089470890" },
];

export function ochchRatingPublicUrl(
  tournamentId: number = OCHCH_RATING_TOURNAMENT_ID,
): string {
  return `https://rating.chgk.info/tournament/${tournamentId}`;
}

export function isOchchEvent(eventId: string): boolean {
  return eventId === OCHCH_EVENT_ID;
}

export interface OchchVenue {
  name: string;
  description: string;
  address: string;
  mapUrl: string;
}

export const OCHCH_VENUE_MAIN: OchchVenue = {
  name: "Hotel Don Giovanni Prague",
  description: "Основная программа 3–4 октября",
  address: "Vinohradská 2733/157a, Žižkov",
  mapUrl: "https://maps.google.com/?q=Hotel+Don+Giovanni+Prague+Vinohradsk%C3%A1+2733%2F157a",
};

export const OCHCH_VENUE_IRIS: OchchVenue = {
  name: "Hotel Iris Eden",
  description: "Город грехов — 2 октября",
  address: "Vladivostocká 1539/2",
  mapUrl: "https://maps.google.com/?q=Hotel+Iris+Eden+Vladivostock%C3%A1+1539+Prague",
};

export const OCHCH_VENUES = [OCHCH_VENUE_MAIN, OCHCH_VENUE_IRIS];

export const OCHCH_CHGK_EDITORS = [
  "Александр Рождествин",
  "Наиль Фарукшин",
  "Михаил Карпук",
  "Тарас Вахрив",
  "Андрей Грищук / Ирина Данилюк",
  "Мария Иванова",
  "Максим Еремеев",
];

export const OCHCH_SI_EDITOR = "Костянтын Каунин";

export const OCHCH_GOROD_GREKHOV_REG_URL = "https://forms.gle/DGWPBur8J8SrkfWG7";
export const OCHCH_SPY_TOUR_REG_URL =
  "https://docs.google.com/forms/d/1CacoM9itbotOLHBjaoPmhRUuHUiXDp31RkThLb4_aYw/viewform";

export const OCHCH_TMINNOE_COPY =
  "3 октября в Праге состоится «Тминное поле №4» — турнир, в котором свои редакторские работы представляют Амаль Имангулов, Елена Тищенко и Максим Янке.";

export const OCHCH_QUIZ_SHEET_ID = "16_vt0L9Aq4Ph3rceBal7MOB0J-mNJwmo-E42zPHXlLM";
export const OCHCH_QUIZ_GID = "9";
export const OCHCH_QUIZ_SHEET_URL = `https://docs.google.com/spreadsheets/d/${OCHCH_QUIZ_SHEET_ID}/edit?gid=${OCHCH_QUIZ_GID}`;

export interface OchchLandingTile {
  slug: string;
  emoji: string;
  title: string;
  href: string;
  note?: string;
}

export const OCHCH_CURRENT_TILES: OchchLandingTile[] = [
  {
    slug: "participants",
    emoji: "👥",
    title: "Участники",
    href: "/ochch/participants",
  },
  {
    slug: "schedule",
    emoji: "🗓️",
    title: "Расписание",
    href: "/ochch/schedule",
  },
  {
    slug: "rules",
    emoji: "📜",
    title: "Положение",
    href: "/ochch/rules",
  },
  {
    slug: "results-chgk",
    emoji: "❓",
    title: "Результаты Что? Где? Когда?",
    href: "/ochch/results-chgk",
  },
  {
    slug: "results-tminnoe",
    emoji: "🌿",
    title: "Результаты «Тминное поле»",
    href: "/ochch/results-tminnoe",
    note: OCHCH_TMINNOE_COPY,
  },
  {
    slug: "results-quiz",
    emoji: "🎸",
    title: "Музыкальный квиз",
    href: "/ochch/results-quiz",
    note: "Третий авторский музыкальный квиз от Андрея Ярмолы.",
  },
  {
    slug: "results-si",
    emoji: "🎯",
    title: "Результаты Своей игры",
    href: "/ochch/results-si",
  },
  {
    slug: "roster",
    emoji: "📋",
    title: "Подать состав",
    href: "/ochch/roster",
  },
  {
    slug: "controversial",
    emoji: "💬",
    title: "Спорные",
    href: "/ochch/controversial",
  },
  {
    slug: "appeals",
    emoji: "⚖️",
    title: "Апелляции",
    href: "/ochch/appeals",
  },
];

export const OCHCH = {
  id: OCHCH_EVENT_ID,
  title: "ОЧЧ-2026",
  longTitle: "Открытый Чемпионат Чехии по Что? Где? Когда?",
  city: "Прага",
  startDate: new Date(Date.UTC(2026, 9, 3)),
  endDate: new Date(Date.UTC(2026, 9, 4)),
  description:
    "Открытый чемпионат Чехии по интеллектуальным играм. 3–4 октября 2026, Hotel Don Giovanni Prague.",
  ratingUrl: ochchRatingPublicUrl(),
} as const;

/** Same 01–46 workbook as Pražma: names from teams tab, IDs from exact-name join. */
export type OchchImportedTeam = PrazmaImportedTeam;

/** One-off OCHCH display names. Rating ID / teamChgkId stays the same. */
const OCHCH_DISPLAY_NAMES: Readonly<Record<number, string>> = {
  78405: "Уже победа",
};

export function applyOchchDisplayName(teamChgkId: number, name: string): string {
  return OCHCH_DISPLAY_NAMES[teamChgkId] ?? name;
}

/** Same table №, different rating team. Official name/city from rating.chgk.info. */
const OCHCH_SLOT_REPLACEMENTS: Readonly<
  Record<number, Pick<OchchImportedTeam, "name" | "city" | "teamChgkId">>
> = {
  26: {
    name: "✕ ⚠️ Имангулов Амаль Бахтиёрович",
    city: "Сборная",
    teamChgkId: 109099,
  },
};

function applyOchchTeamSlots(
  teams: readonly OchchImportedTeam[],
): OchchImportedTeam[] {
  return teams.map((t) => {
    const slot = OCHCH_SLOT_REPLACEMENTS[t.number];
    const next = slot ? { ...t, ...slot } : t;
    return {
      ...next,
      name: applyOchchDisplayName(next.teamChgkId, next.name),
    };
  });
}

export const OCHCH_TEAMS: readonly OchchImportedTeam[] = applyOchchTeamSlots(
  PRAZMA_TEAMS,
);

/** Invitation group from «Группа приглашений» on the ОЧЧ teams tab. */
export type OchchInviteCriterion =
  | "Аукцион"
  | "Лотерея"
  | "Wildcard"
  | "Рейтинг"
  | "Чешские команды";

export interface OchchInviteMeta {
  czech: boolean;
  criterion: OchchInviteCriterion | null;
}

function inviteCriterionByNumber(n: number): OchchInviteCriterion | null {
  if (n >= 1 && n <= 2) return "Аукцион";
  if (n >= 3 && n <= 13) return "Лотерея";
  if (n >= 14 && n <= 27) return "Wildcard";
  if (n >= 28 && n <= 37) return "Рейтинг";
  if (n >= 38 && n <= 46) return "Чешские команды";
  return null;
}

function normOchchName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
}

const OCHCH_INVITE_BY_ID = new Map<number, OchchInviteMeta>();
const OCHCH_INVITE_BY_NAME = new Map<string, OchchInviteMeta>();
const OCHCH_INVITE_BY_NUMBER = new Map<number, OchchInviteMeta>();

for (const team of OCHCH_TEAMS) {
  const criterion = inviteCriterionByNumber(team.number);
  const meta: OchchInviteMeta = {
    czech: criterion === "Чешские команды",
    criterion,
  };
  OCHCH_INVITE_BY_ID.set(team.teamChgkId, meta);
  OCHCH_INVITE_BY_NAME.set(normOchchName(team.name), meta);
  OCHCH_INVITE_BY_NUMBER.set(team.number, meta);
}

const EMPTY_INVITE: OchchInviteMeta = { czech: false, criterion: null };

/** Match by chgk ID, then name, then seed number. */
export function ochchInviteFor(team: {
  number: number;
  name: string;
  teamChgkId: number;
}): OchchInviteMeta {
  return (
    OCHCH_INVITE_BY_ID.get(team.teamChgkId) ??
    OCHCH_INVITE_BY_NAME.get(normOchchName(team.name)) ??
    OCHCH_INVITE_BY_NUMBER.get(team.number) ??
    EMPTY_INVITE
  );
}

async function seedOchchTeams(teams: readonly OchchImportedTeam[]) {
  const slotted = applyOchchTeamSlots(teams);
  const officialById = new Map(PRAZMA_TEAMS.map((t) => [t.teamChgkId, t.name]));
  await db.$transaction(
    slotted.map((team) => {
      const officialName = officialById.get(team.teamChgkId) ?? team.name;
      return db.eventTeam.upsert({
        where: {
          eventId_teamChgkId: {
            eventId: OCHCH_EVENT_ID,
            teamChgkId: team.teamChgkId,
          },
        },
        create: {
          eventId: OCHCH_EVENT_ID,
          teamChgkId: team.teamChgkId,
          teamName: officialName,
          displayName: applyOchchDisplayName(team.teamChgkId, team.name),
          city: team.city,
        },
        update: {
          teamName: officialName,
          displayName: applyOchchDisplayName(team.teamChgkId, team.name),
          city: team.city,
        },
      });
    }),
  );
}

/** Point EventTeam at the replacement ID; leave TeamRoster on the old ID. */
async function syncOchchSlotReplacements() {
  for (const seed of PRAZMA_TEAMS) {
    const slot = OCHCH_SLOT_REPLACEMENTS[seed.number];
    if (!slot || slot.teamChgkId === seed.teamChgkId) continue;
    await db.eventTeam.updateMany({
      where: { eventId: OCHCH_EVENT_ID, teamChgkId: seed.teamChgkId },
      data: {
        teamChgkId: slot.teamChgkId,
        teamName: slot.name,
        displayName: applyOchchDisplayName(slot.teamChgkId, slot.name),
        city: slot.city,
      },
    });
  }
}

/** Idempotent — CalendarEvent + EventTeam rows with rating.chgk.info IDs. */
export async function ensureOchchEvent() {
  const existing = await db.calendarEvent.findUnique({
    where: { id: OCHCH_EVENT_ID },
    include: { _count: { select: { eventTeams: true } } },
  });

  const event =
    existing ??
    (await db.calendarEvent.create({
      data: {
        id: OCHCH_EVENT_ID,
        title: `${OCHCH.longTitle} (ОЧЧ-2026)`,
        type: "multi-day",
        startDate: OCHCH.startDate,
        endDate: OCHCH.endDate,
        city: OCHCH.city,
        venue: OCHCH_VENUE_MAIN.name,
        venueMapUrl: OCHCH_VENUE_MAIN.mapUrl,
        description: OCHCH.description,
        ratingUrl: OCHCH.ratingUrl,
        mediaLink: OCHCH_CHANNEL_URL,
        mediaLinkLabel: "Канал ОЧЧ",
      },
    }));

  if (!existing || existing._count.eventTeams < OCHCH_TEAMS.length) {
    const teams = await loadPrazmaImportedTeams();
    await seedOchchTeams(teams.length > 0 ? teams : OCHCH_TEAMS);
  }

  if (existing) await syncOchchSlotReplacements();

  return event;
}

export async function listOchchParticipants(): Promise<OchchImportedTeam[]> {
  const rows = await db.eventTeam.findMany({
    where: { eventId: OCHCH_EVENT_ID, withdrawnAt: null },
    select: { teamChgkId: true, teamName: true, displayName: true, city: true },
  });
  const numberById = new Map(OCHCH_TEAMS.map((t) => [t.teamChgkId, t.number]));
  const teams = rows
    .filter((r) => r.teamChgkId > 0)
    .map((r) => ({
      number: numberById.get(r.teamChgkId) ?? r.teamChgkId,
      name: applyOchchDisplayName(
        r.teamChgkId,
        (r.displayName || r.teamName).trim(),
      ),
      city: r.city?.trim() || "",
      teamChgkId: r.teamChgkId,
    }));
  teams.sort((a, b) => a.number - b.number || a.name.localeCompare(b.name, "ru"));
  return teams;
}

export const OCHCH_ADMIN_TEAM_REQUIRED =
  "Выберите команду, за которую подаёте";

export type OchchTeamOption = {
  teamChgkId: number;
  number: number;
  name: string;
};

export function formatOchchTeamOptionLabel(team: OchchTeamOption): string {
  return `№${team.number} ${team.name}`;
}

export async function listOchchTeamOptions(): Promise<OchchTeamOption[]> {
  const teams = await listOchchParticipants().catch(() => []);
  const source = teams.length > 0 ? teams : OCHCH_TEAMS;
  return source.map((t) => ({
    teamChgkId: t.teamChgkId,
    number: t.number,
    name: t.name,
  }));
}

export function parseOchchTeamChgkId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const n = parseInt(value.trim(), 10);
    return n > 0 ? n : null;
  }
  return null;
}

export async function isOchchSubmitTeamId(teamChgkId: number): Promise<boolean> {
  if (OCHCH_TEAMS.some((t) => t.teamChgkId === teamChgkId)) return true;
  const row = await db.eventTeam.findFirst({
    where: { eventId: OCHCH_EVENT_ID, teamChgkId, withdrawnAt: null },
    select: { teamChgkId: true },
  });
  return row != null;
}

/** Roster team wins. Page admin without roster may pick a known OCHCH team. Others cannot. */
export async function resolveOchchSubmitTeamChgkId(opts: {
  isPageAdmin: boolean;
  rosterTeamChgkId: number | null;
  requestedTeamChgkId: unknown;
}): Promise<
  | { ok: true; teamChgkId: number }
  | { ok: false; error: string; status: 400 | 403 }
> {
  if (opts.rosterTeamChgkId != null) {
    return { ok: true, teamChgkId: opts.rosterTeamChgkId };
  }
  if (!opts.isPageAdmin) {
    return { ok: false, error: "not-in-roster", status: 403 };
  }
  const parsed = parseOchchTeamChgkId(opts.requestedTeamChgkId);
  if (parsed == null || !(await isOchchSubmitTeamId(parsed))) {
    return { ok: false, error: OCHCH_ADMIN_TEAM_REQUIRED, status: 400 };
  }
  return { ok: true, teamChgkId: parsed };
}
