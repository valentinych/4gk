import sugrobushki2025 from "./turnirushki/olymp/sugrobushki-2025.json";

export interface OlympTeam {
  name: string;
  tours: number[];
  total: number;
  place?: number;
}

export interface OlympGroup {
  id: string;
  label: string;
  teams: OlympTeam[];
}

export interface OlympResults {
  tournamentSlug: string;
  title: string;
  source?: string;
  groups: OlympGroup[];
}

const ALL: Record<string, OlympResults> = {
  [sugrobushki2025.tournamentSlug]: sugrobushki2025 as OlympResults,
};

export function getOlympResults(tournamentSlug: string): OlympResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasOlympResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
