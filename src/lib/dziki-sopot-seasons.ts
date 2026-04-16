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
}

/** Tiles for upcoming season (2026) */
export const DS_CURRENT_TILES: DsLandingTile[] = [
  {
    slug: "registration",
    emoji: "📝",
    title: "Регистрация",
    href: "https://forms.gle/oyfmJnro1q9S2Ydj8",
  },
  {
    slug: "participants",
    emoji: "👥",
    title: "Участники",
    href: "/dziki-sopot/participants",
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
