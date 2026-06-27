import vesnushki2025 from "./turnirushki/kubok/vesnushki-2025.json";

export interface KubokPlayer {
  place: number;
  name: string;
  total: number;
  tours: number[];
}

export interface KubokResults {
  tournamentSlug: string;
  title: string;
  source?: string;
  players: KubokPlayer[];
}

const ALL: Record<string, KubokResults> = {
  [vesnushki2025.tournamentSlug]: vesnushki2025 as KubokResults,
};

export function getKubokResults(tournamentSlug: string): KubokResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasKubokResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
