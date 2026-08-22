export const DS_MAIN_EVENT_ID = "cmmw82nst000asf012sw62tlo";
export const DS_LUNCH_ORDER_URL = "https://forms.gle/icWjh6o7dgnh8Akj6";
export const DS_UPCOMING_YEAR = 2026;
export const DS_ARCHIVE_YEARS = [2025, 2024] as const;
export type DsArchiveYear = (typeof DS_ARCHIVE_YEARS)[number];

/** All selectable years, newest first */
export const DS_ALL_YEARS = [DS_UPCOMING_YEAR, ...DS_ARCHIVE_YEARS] as const;
export type DsYear = (typeof DS_ALL_YEARS)[number];

export const DS_TOURNAMENT_BY_YEAR: Record<DsArchiveYear, number> = {
  2025: 12462,
  2024: 11247,
};

export function isArchiveYear(year: number): year is DsArchiveYear {
  return DS_ARCHIVE_YEARS.includes(year as DsArchiveYear);
}

export function parseDsYear(raw: string | null | undefined): DsYear | null {
  const y = parseInt(String(raw ?? ""), 10);
  if (isNaN(y)) return null;
  return DS_ALL_YEARS.includes(y as DsYear) ? (y as DsYear) : null;
}

export function resolveDsTournamentId(year: DsArchiveYear): number {
  return DS_TOURNAMENT_BY_YEAR[year];
}

export function dsRatingPublicUrl(tournamentId: number): string {
  return `https://rating.chgk.info/tournament/${tournamentId}`;
}

export function dsYearLabel(year: DsYear): string {
  return `Dziki Sopot 🐗 — ${year}`;
}

export interface DsLandingTile {
  slug: string;
  emoji: string;
  title: string;
  href?: string;
  note?: string;
}

export interface DsVenue {
  name: string;
  subtitle?: string;
  description: string;
  mapUrl: string;
}

/** Venues for the upcoming 2026 season */
export const DS_VENUES_2026: DsVenue[] = [
  {
    name: "Aquapark Sopot",
    subtitle: "ресторан",
    description: "Основная программа 5–6 сентября",
    mapUrl: "https://maps.app.goo.gl/VLBnyYiYCSeiyGyk8",
  },
  {
    name: "Hotel Aqua Sopot — Destigo Hotels",
    description: "Синхроны 4 сентября и кнопки 5 сентября",
    mapUrl: "https://maps.app.goo.gl/Srm6QvWDs77QJHfc8",
  },
];

/** Tiles for upcoming season (2026), 3 per row on large screens */
export const DS_CURRENT_TILES: DsLandingTile[] = [
  {
    slug: "participants",
    emoji: "👥",
    title: "Участники",
    href: "/dziki-sopot/participants",
  },
  {
    slug: "schedule",
    emoji: "🗓️",
    title: "Расписание",
    href: "/dziki-sopot/schedule",
  },
  {
    slug: "regulations",
    emoji: "📜",
    title: "Положение о турнире",
    href: "/dziki-sopot/regulations",
  },
  {
    slug: "registration",
    emoji: "📝",
    title: "Регистрация на турнир",
    href: "https://forms.gle/oyfmJnro1q9S2Ydj8",
  },
  {
    slug: "sync-ostrovok",
    emoji: "🎲",
    title: "Регистрация на синхрон «Островок Бесконечности: шестой Супервыпуск»",
    href: "/calendar/ds-2026-sync-ostrovok",
    note: "4 сентября 18.00",
  },
  {
    slug: "sync-chudove",
    emoji: "🎲",
    title: "Регистрация на синхрон «Чудове Чудовисько»",
    href: "/calendar/ds-2026-sync-chudove",
    note: "4 сентября 18.00",
  },
  {
    slug: "roster",
    emoji: "📋",
    title: "Подать состав на двухдневный турнир Dziki Sopot",
    href: "/dziki-sopot/roster",
  },
  {
    slug: "roster-ostrovok",
    emoji: "📋",
    title: "Подать состав на «Островок Бесконечности: шестой Супервыпуск»",
    href: "/dziki-sopot/roster-ostrovok",
  },
  {
    slug: "roster-chudove",
    emoji: "📋",
    title: "Подать состав на «Чудове Чудовисько»",
    href: "/dziki-sopot/roster-chudove",
  },
  {
    slug: "lunch",
    emoji: "🍽️",
    title: "Заказать обед (до 30.08.26)",
    href: DS_LUNCH_ORDER_URL,
  },
  {
    slug: "tshirts",
    emoji: "👕",
    title: "Заказ маек",
    href: "https://forms.gle/mDhkai5rTvKQBnpR9",
  },
];

/** Tiles for archive seasons */
export const DS_ARCHIVE_TILES: Record<DsArchiveYear, DsLandingTile[]> = {
  2025: [
    {
      slug: "rating-page",
      emoji: "🌐",
      title: "Страница турнира на сайте рейтинга",
      href: "/dziki-sopot/rating-page?year=2025",
    },
    {
      slug: "results-chgk",
      emoji: "❓",
      title: "Результаты Что? Где? Когда?",
      href: "/dziki-sopot/results-chgk?year=2025",
    },
  ],
  2024: [
    {
      slug: "rating-page",
      emoji: "🌐",
      title: "Страница турнира на сайте рейтинга",
      href: "/dziki-sopot/rating-page?year=2024",
    },
    {
      slug: "results-chgk",
      emoji: "❓",
      title: "Результаты Что? Где? Когда?",
      href: "/dziki-sopot/results-chgk?year=2024",
    },
  ],
};
