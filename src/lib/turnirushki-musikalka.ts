import drovushki2024 from "./turnirushki/musikalka/drovushki-exportnye-2024.json";
import sugrobushki2025 from "./turnirushki/musikalka/sugrobushki-2025.json";
import vesnushki2025 from "./turnirushki/musikalka/vesnushki-2025.json";

export interface MusikalkaTeam {
  place?: number;
  name: string;
  blocks: number[];
  total: number;
}

export interface MusikalkaResults {
  tournamentSlug: string;
  title: string;
  blockLabels: string[];
  source?: string;
  teams: MusikalkaTeam[];
}

const ALL: Record<string, MusikalkaResults> = {
  [drovushki2024.tournamentSlug]: drovushki2024 as MusikalkaResults,
  [sugrobushki2025.tournamentSlug]: sugrobushki2025 as MusikalkaResults,
  [vesnushki2025.tournamentSlug]: vesnushki2025 as MusikalkaResults,
};

export function getMusikalkaResults(tournamentSlug: string): MusikalkaResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasMusikalkaResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
