import sugrobushki2026 from "./turnirushki/isi/sugrobushki-2026.json";
import vesnushki2024 from "./turnirushki/isi/vesnushki-2024.json";

export interface IsiQualResult {
  place: number;
  name: string;
  total: number;
  note?: string;
}

export interface IsiPlayoffMatch {
  player: string;
  score: number | null;
  scoreRaw: string | null;
  place: number | null;
}

export interface IsiPlayoffBout {
  label: string;
  matches: IsiPlayoffMatch[];
}

export interface IsiSeed {
  place: number;
  name: string;
}

export interface IsiResults {
  tournamentSlug: string;
  title: string;
  seedSource: string;
  qualification: IsiQualResult[];
  playoffs: {
    bouts: IsiPlayoffBout[];
    seeds: IsiSeed[];
  };
}

const ALL: Record<string, IsiResults> = {
  [vesnushki2024.tournamentSlug]: vesnushki2024 as IsiResults,
  [sugrobushki2026.tournamentSlug]: sugrobushki2026 as IsiResults,
};

export function getIsiResults(tournamentSlug: string): IsiResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasIsiResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
