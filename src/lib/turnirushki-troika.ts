import vesnushki2024 from "./turnirushki/troika/vesnushki-2024.json";

export interface TroikaQualResult {
  place: number;
  name: string;
  score: number;
}

export interface TroikaPlayoffMatch {
  seed: number | null;
  team: string;
  score: number;
}

export interface TroikaPlayoffBout {
  label: string;
  matches: TroikaPlayoffMatch[];
}

export interface TroikaFinalStanding {
  place: number;
  name: string;
}

export interface TroikaResults {
  tournamentSlug: string;
  title: string;
  qualification: TroikaQualResult[];
  playoffs: {
    bouts: TroikaPlayoffBout[];
    finalStandings: TroikaFinalStanding[];
  };
}

const ALL: Record<string, TroikaResults> = {
  [vesnushki2024.tournamentSlug]: vesnushki2024 as TroikaResults,
};

export function getTroikaResults(tournamentSlug: string): TroikaResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasTroikaResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
