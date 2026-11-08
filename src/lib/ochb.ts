import { ratingChgkResultsQuery } from "./chgk-tournament-results";
import { db } from "./db";

export const OCHB_EVENT_ID = "ochb-2026";
export const OCHB_PATH = "/ochb";
export const OCHB_RATING_TOURNAMENT_ID = 14496;
export const OCHB_CHANNEL_URL = "https://t.me/nvrmr_bcn";
export const OCHB_DATE_LABEL = "20–22 ноября 2026";

/** From https://t.me/nvrmr_bcn/60. The form preview uses the same URL. */
export const OCHB_LINKS = [
  {
    label: "Форма регистрации",
    href: "https://forms.gle/64ZLtBEfer1JxJWw7",
  },
  {
    label: "Актуальный список команд",
    href: "https://docs.google.com/spreadsheets/d/1R1gdkozkB5mXLardOftR6KlNhheWMdjDS2F-7q8yfOs/edit?usp=sharing",
  },
  {
    label: "Пост для поиска легионеров и команд",
    href: "https://t.me/nvrmr_bcn/56",
  },
  {
    label: "Открытый чемпионат Барселоны",
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
    slug: "links",
    emoji: "🔗",
    title: "Полезные ссылки",
    href: "/ochb/links",
  },
  {
    slug: "results",
    emoji: "🏆",
    title: "Результаты рейтинга",
    href: "/ochb/results",
  },
  {
    slug: "registration",
    emoji: "📝",
    title: OCHB_LINKS[0].label,
    href: OCHB_LINKS[0].href,
    external: true,
  },
];

export function ochbRatingPublicUrl(
  tournamentId: number = OCHB_RATING_TOURNAMENT_ID,
): string {
  return `https://rating.chgk.info/tournament/${tournamentId}`;
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

/** Create the calendar row only when it is missing. Does not seed teams. */
export async function ensureOchbEvent() {
  const existing = await db.calendarEvent.findUnique({
    where: { id: OCHB_EVENT_ID },
  });
  if (existing) return existing;

  return db.calendarEvent.create({
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
  });
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
