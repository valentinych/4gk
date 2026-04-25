import drovushki2023 from "./turnirushki/ksi/drovushki-exportnye-2023.json";

export interface KsiTeam {
  position: number;
  number: number;
  name: string;
  region: string;
  total: number;
  scores: number[];
  tiebreaker?: string;
  legionnaire?: boolean;
}

export interface KsiResults {
  tournamentSlug: string;
  title: string;
  questionCount: number;
  source: string;
  teams: KsiTeam[];
}

const ALL: Record<string, KsiResults> = {
  [drovushki2023.tournamentSlug]: drovushki2023 as KsiResults,
};

export function getKsiResults(tournamentSlug: string): KsiResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasKsiResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
