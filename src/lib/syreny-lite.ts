import { db } from "./db";
import { fetchChgkGgRatings } from "./chgk-gg";

export const SYRENY_LITE_EVENT_ID = "mazowieckie-syreny-lite";

/** Display-side team name overrides (matched case-insensitively). */
export const SYRENY_LITE_RENAMED_TEAM_NAMES = new Map<string, string>([
  ["кучин айленд", "Коробучин"],
  ["кучин айланд", "Коробучин"],
  ["домкрат гагарина", "Домкрат - пять гривен"],
  ["ежу понятно", "Ой, всё!"],
]);

/** ЧГК на haza.online — трансляция Syrenki Mazowieckie Lite 2026. */
export const SYRENY_LITE_CHGK = {
  hazaBroadcastId: 665,
  title: "Что? Где? Когда?",
} as const;

export function syrenyLiteChgkSourceUrl(broadcastId: number): string {
  return `https://www.haza.online/broadcast/${broadcastId}`;
}

export const SYRENY_LITE_KSI = {
  sheetId: "1JwcOlGv2w0tFNQ3_Xs7ffDXtirmJYGs1bmZ7McaOssk",
  gid: "2116355512",
  source:
    "https://docs.google.com/spreadsheets/d/1JwcOlGv2w0tFNQ3_Xs7ffDXtirmJYGs1bmZ7McaOssk/edit?gid=2116355512",
  topicCount: 20,
  questionCosts: [10, 20, 30, 40, 50] as const,
} as const;

/** Teams ranked 600th or higher play out of the main standings. */
export function isOutOfCompetition(ratingPosition: number | null): boolean {
  return ratingPosition !== null && ratingPosition <= 600;
}

export function applySyrenyLiteDisplayName(name: string): string {
  return SYRENY_LITE_RENAMED_TEAM_NAMES.get(normalizeSyrenyLiteName(name)) ?? name;
}

/** Normalized display names of teams in the «Вне зачёта» standings. */
export async function getSyrenyLiteOutOfCompetitionNames(): Promise<Set<string>> {
  const teams = await db.eventTeam.findMany({
    where: { eventId: SYRENY_LITE_EVENT_ID, withdrawnAt: null },
    select: { teamName: true, displayName: true, teamChgkId: true, manualEntry: true },
  });

  const realIds = teams
    .filter((t) => !t.manualEntry && t.teamChgkId > 0)
    .map((t) => t.teamChgkId);
  const { map: ratings } = await fetchChgkGgRatings(realIds);

  const out = new Set<string>();
  for (const t of teams) {
    const display = applySyrenyLiteDisplayName(t.displayName ?? t.teamName);
    const r = !t.manualEntry && t.teamChgkId > 0 ? ratings.get(t.teamChgkId) : null;
    const pos = r?.position ?? null;
    if (isOutOfCompetition(pos)) {
      out.add(normalizeSyrenyLiteName(display));
    }
  }
  return out;
}

/**
 * Team display-name overrides applied at the API boundary (no DB writes).
 * Names are matched case-insensitively against `displayName ?? teamName`.
 *
 * Kept in shared lib so any place that reports "team count" for this event
 * (e.g. /api/roster/counts) can apply the same hiding rules and stay
 * consistent with the participants list.
 */
export const SYRENY_LITE_HIDDEN_TEAM_NAMES = new Set<string>(["коробка"]);

export const normalizeSyrenyLiteName = (s: string) => s.trim().toLowerCase();

export const SYRENY_LITE = {
  id: SYRENY_LITE_EVENT_ID,
  title: "Syrenki Mazowieckie Lite",
  city: "Варшава",
  year: 2026,
  /** Saturday 6 June 2026 */
  startDate: new Date(Date.UTC(2026, 5, 6)),
  /** Sunday 7 June 2026 */
  endDate: new Date(Date.UTC(2026, 5, 7)),
  /** 27 April 2026 12:00 Europe/Warsaw == 10:00 UTC (CEST = UTC+2) */
  registrationOpensAt: new Date("2026-04-27T10:00:00Z"),
  description:
    "Любительский турнир для начинающих команд. Два дня игр в Варшаве: КСИ, Б-52, Брейн-Ринг, ЭК, Чёрное ЧГК и Островок Бесконечности.",
} as const;

export interface ScheduleItem {
  time: string;
  title: string;
  /** Optional second line shown under the title (e.g. linked sync inside an in-person slot) */
  subtitle?: string;
  href?: string;
  note?: string;
}

export const SYRENY_LITE_SCHEDULE: { day: string; items: ScheduleItem[] }[] = [
  {
    day: "Суббота, 6 июня 2026",
    items: [
      { time: "11:00–11:50", title: "Открытие и Командная «Своя игра» (первые 10 тем)" },
      {
        time: "12:00–14:15",
        title: "ЧГК, туры 1–3 · синхрон «B-52: S02E09»",
        note: "сложность 2,0",
        href: "https://rating.chgk.info/tournament/13292",
      },
      { time: "14:15–15:30", title: "Обед" },
      { time: "15:30–17:45", title: "Брэйн-ринг" },
      {
        time: "18:15–20:30",
        title: "Чёрное ЧГК · асинхронный турнир «Сквиртл»",
        subtitle: "от Максима Мерзлякова. 18+",
        note: "сложность 3,5",
        href: "https://rating.chgk.info/tournament/12490",
      },
    ],
  },
  {
    day: "Воскресенье, 7 июня 2026",
    items: [
      { time: "10:30–11:20", title: "Командная «Своя игра» (вторые 10 тем)" },
      {
        time: "11:30–13:50",
        title: "ЧГК, туры 4–6 · синхрон «Островок Бесконечности: июнь»",
        note: "сложность 3,5",
        href: "https://rating.chgk.info/tournament/13008",
      },
      { time: "14:00", title: "Награждение, закрытие" },
    ],
  },
];

/**
 * Ensures the CalendarEvent row for this tournament exists.
 * Idempotent — safe to call from any request handler.
 */
export async function ensureSyrenyLiteEvent() {
  const existing = await db.calendarEvent.findUnique({
    where: { id: SYRENY_LITE_EVENT_ID },
  });
  if (existing) return existing;

  return db.calendarEvent.create({
    data: {
      id: SYRENY_LITE_EVENT_ID,
      title: SYRENY_LITE.title,
      type: "multi-day",
      startDate: SYRENY_LITE.startDate,
      endDate: SYRENY_LITE.endDate,
      city: SYRENY_LITE.city,
      description: SYRENY_LITE.description,
      registrationOpensAt: SYRENY_LITE.registrationOpensAt,
    },
  });
}

/**
 * Allocate a synthetic negative teamChgkId for manual entries (teams not yet on
 * rating.chgk.info). Required because EventTeam has @@unique([eventId, teamChgkId]).
 */
export async function allocateManualTeamChgkId(eventId: string): Promise<number> {
  const min = await db.eventTeam.aggregate({
    where: { eventId },
    _min: { teamChgkId: true },
  });
  const current = min._min.teamChgkId ?? 0;
  return Math.min(current, 0) - 1;
}
