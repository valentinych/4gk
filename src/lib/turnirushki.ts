export interface Turnirushka {
  slug: string;
  name: string;
  year: number;
  dateLabel: string;
  ratingTournamentId: number;
}

export const TURNIRUSHKI: Turnirushka[] = [
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
