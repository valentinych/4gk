import { db } from "./db";

export const OCHCH_EVENT_ID = "ochch-2026";
export const OCHCH_PATH = "/ochch";
export const OCHCH_RATING_TOURNAMENT_ID = 14219;
export const OCHCH_CHANNEL_URL = "https://t.me/o44praha";
export const OCHCH_DATE_LABEL = "3–4 октября 2026";

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

export interface OchchLandingTile {
  slug: string;
  emoji: string;
  title: string;
  href: string;
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
    title: "Спорный",
    href: "/ochch/controversial",
  },
  {
    slug: "appeals",
    emoji: "⚖️",
    title: "Апелляции на ЧГК",
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

/** Idempotent — creates the CalendarEvent row if missing. No schema change. */
export async function ensureOchchEvent() {
  const existing = await db.calendarEvent.findUnique({
    where: { id: OCHCH_EVENT_ID },
  });
  if (existing) return existing;

  return db.calendarEvent.create({
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
  });
}
