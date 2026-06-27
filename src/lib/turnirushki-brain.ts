import sugrobushki2024 from "./turnirushki/brain/sugrobushki-2024.json";

export interface BrainGroupTeam {
  num: number;
  name: string;
  amateur?: boolean;
  scoredFor: number | null;
  diff: number | null;
  zeros: number | null;
  place: number | null;
  bracket?: string;
}

export interface BrainGroup {
  id: string;
  label: string;
  venue: string;
  host: string;
  session: string;
  teams: BrainGroupTeam[];
}

export interface BrainPlayoffMatch {
  slot: string;
  team: string;
  score: number | null;
}

export interface BrainPlayoffBout {
  label: string;
  matches: BrainPlayoffMatch[];
}

export interface BrainPodiumTeam {
  name: string;
  score: number | null;
  place: number;
}

export interface BrainResults {
  tournamentSlug: string;
  title: string;
  seedSource: string;
  seeds: { chgkPlace: number; name: string; amateur?: boolean }[];
  groups: BrainGroup[];
  playoffs: {
    roundOf16: BrainPlayoffBout[];
    quarterfinals: BrainPlayoffBout[];
    semifinals: BrainPlayoffBout[];
    final: { label: string; venue: string; teams: BrainPodiumTeam[] };
    thirdPlace: { label: string; venue: string; teams: BrainPodiumTeam[] };
  };
}

const ALL: Record<string, BrainResults> = {
  [sugrobushki2024.tournamentSlug]: sugrobushki2024 as BrainResults,
};

export function getBrainResults(tournamentSlug: string): BrainResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasBrainResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
