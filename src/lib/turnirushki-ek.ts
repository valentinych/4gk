import drovushki2023 from "./turnirushki/ek/drovushki-exportnye-2023.json";
import vesnushki2024 from "./turnirushki/ek/vesnushki-2024.json";

export interface EkTeamResult {
  name: string;
  score: number;
  place: number;
  ksi?: number;
  chgk?: number;
  bracket?: string;
  boutPoints?: number;
}

export interface EkSeed {
  name: string;
  ksi?: number;
  chgk?: number;
}

export interface EkBoutTeam {
  name: string;
  score: number;
  place: number;
  boutPoints: number;
}

export interface EkBoutGroup {
  id: string;
  label: string;
  venue: string;
  teams: EkBoutTeam[];
}

export interface EkRound {
  number: number;
  label: string;
  groups: EkBoutGroup[];
}

export interface EkStanding {
  place: number;
  name: string;
  bout1Points: number;
  bout2Points: number;
  total: number;
}

export interface EkPlayoffRound {
  label: string;
  venue: string;
  teams: EkTeamResult[];
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
  format?: "playoffs" | "baskets" | "two-rounds";
  packName?: string;
  seeds: EkSeed[];
  allTeams?: string[];
  baskets?: EkBasketRound[];
  rounds?: EkRound[];
  standings?: EkStanding[];
  playoffRounds?: EkPlayoffRound[];
  quarterfinals: EkQuarterfinalGroup[];
  semifinals: EkSemifinal[];
  final: { venue: string; teams: EkTeamResult[] };
}

export interface EkBasketMatch {
  seed: number;
  team: string;
  opponent: string;
}

export interface EkBasketRound {
  label: string;
  matches: EkBasketMatch[];
}

const ALL: Record<string, EkResults> = {
  [drovushki2023.tournamentSlug]: drovushki2023 as EkResults,
  [vesnushki2024.tournamentSlug]: vesnushki2024 as EkResults,
};

export function getEkResults(tournamentSlug: string): EkResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasEkResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
