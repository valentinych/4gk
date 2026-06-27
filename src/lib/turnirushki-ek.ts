import drovushki2023 from "./turnirushki/ek/drovushki-exportnye-2023.json";

export interface EkTeamResult {
  name: string;
  score: number;
  place: number;
  ksi?: number;
  bracket?: string;
}

export interface EkQuarterfinalGroup {
  group: string;
  label: string;
  venue: string;
  host: string;
  teams: EkTeamResult[];
}

export interface EkSemifinal {
  number: number;
  label: string;
  venue: string;
  teams: EkTeamResult[];
}

export interface EkResults {
  tournamentSlug: string;
  title: string;
  seedSource: string;
  seeds: { ksi: number; name: string }[];
  quarterfinals: EkQuarterfinalGroup[];
  semifinals: EkSemifinal[];
  final: { venue: string; teams: EkTeamResult[] };
}

const ALL: Record<string, EkResults> = {
  [drovushki2023.tournamentSlug]: drovushki2023 as EkResults,
};

export function getEkResults(tournamentSlug: string): EkResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasEkResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
