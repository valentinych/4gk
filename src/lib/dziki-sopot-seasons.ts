export const DS_YEARS = [2025, 2024] as const;
export type DsYear = (typeof DS_YEARS)[number];

export const DS_TOURNAMENT_BY_YEAR: Record<DsYear, number> = {
  2025: 12462,
  2024: 11247,
};

export function parseDsYear(raw: string | null | undefined): DsYear | null {
  const y = parseInt(String(raw ?? ""), 10);
  if (isNaN(y)) return null;
  return DS_YEARS.includes(y as DsYear) ? (y as DsYear) : null;
}

export function resolveDsTournamentId(year: DsYear | null): number {
  return DS_TOURNAMENT_BY_YEAR[year ?? DS_YEARS[0]];
}

export function dsRatingPublicUrl(tournamentId: number): string {
  return `https://rating.chgk.info/tournament/${tournamentId}`;
}

export function dsYearLabel(year: DsYear): string {
  return `DS'${String(year + 1).slice(-2)}`;
}
