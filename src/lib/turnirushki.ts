export interface Turnirushka {
  slug: string;
  name: string;
  year: number;
  dateLabel: string;
  ratingTournamentId: number;
}

export const TURNIRUSHKI: Turnirushka[] = [
  {
    slug: "sugrobushki-2026",
    name: "Сугробушки",
    year: 2026,
    dateLabel: "10–11 января 2026 г.",
    ratingTournamentId: 12585,
  },
  {
    slug: "sugrobushki-2025",
    name: "Сугробушки",
    year: 2025,
    dateLabel: "15–16 февраля 2025 г.",
    ratingTournamentId: 11497,
  },
  {
    slug: "sugrobushki-2024",
    name: "Сугробушки",
    year: 2024,
    dateLabel: "13–14 января 2024 г.",
    ratingTournamentId: 9933,
  },
  {
    slug: "vesnushki-2025",
    name: "Веснушки",
    year: 2025,
    dateLabel: "16–18 мая 2025 г.",
    ratingTournamentId: 11487,
  },
  {
    slug: "vesnushki-2024",
    name: "Веснушки",
    year: 2024,
    dateLabel: "10–12 мая 2024 г.",
    ratingTournamentId: 10304,
  },
  {
    slug: "drovushki-exportnye-2025",
    name: "Дровушки экспортные",
    year: 2025,
    dateLabel: "12–13 июля 2025 г.",
    ratingTournamentId: 12074,
  },
  {
    slug: "drovushki-exportnye-2024",
    name: "Дровушки экспортные",
    year: 2024,
    dateLabel: "20–21 июля 2024 г.",
    ratingTournamentId: 10280,
  },
  {
    slug: "drovushki-exportnye-2023",
    name: "Дровушки экспортные",
    year: 2023,
    dateLabel: "22–23 июля 2023 г.",
    ratingTournamentId: 9159,
  },
];

export function ratingTournamentUrl(id: number): string {
  return `https://rating.chgk.info/tournament/${id}`;
}

export function turnirushkaLabel(t: Turnirushka): string {
  return `${t.name} ${t.year}`;
}

export function findTurnirushkaBySlug(slug: string | null | undefined): Turnirushka {
  if (!slug) return TURNIRUSHKI[0];
  return TURNIRUSHKI.find((t) => t.slug === slug) ?? TURNIRUSHKI[0];
}
