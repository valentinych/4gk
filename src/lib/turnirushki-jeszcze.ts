import drovushki2025 from "./turnirushki/jeszcze/drovushki-exportnye-2025.json";

export interface JeszczeTeam {
  number: number;
  name: string;
  city: string;
  total: number;
  place: number;
  rounds: (number | null)[];
}

export interface JeszczeResults {
  tournamentSlug: string;
  title: string;
  source?: string;
  teams: JeszczeTeam[];
}

const ALL: Record<string, JeszczeResults> = {
  [drovushki2025.tournamentSlug]: drovushki2025 as JeszczeResults,
};

export function getJeszczeResults(tournamentSlug: string): JeszczeResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasJeszczeResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
