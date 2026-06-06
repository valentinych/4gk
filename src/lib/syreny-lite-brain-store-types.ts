export type BrainSectionId =
  | "group-a"
  | "group-b"
  | "out-group"
  | "sf1"
  | "sf2"
  | "third"
  | "final";

export interface BrainTeam {
  id: string;
  name: string;
  outOfCompetition: boolean;
}

export interface BrainMatch {
  id: string;
  sectionId: BrainSectionId;
  teamAId: string;
  teamBId: string;
  questionCount: number;
  playOrder: number;
  captures: (string | null | undefined)[];
}

export interface BrainSection {
  id: BrainSectionId;
  name: string;
  teamIds: string[];
}

export interface BrainGroupAssignments {
  groupA: string[];
  groupB: string[];
  outGroup: string[];
}

export type BrainDrawGroupKey = "groupA" | "groupB" | "outGroup";

export interface BrainDrawRevealStep {
  teamId: string;
  group: BrainDrawGroupKey;
}

export interface BrainDrawReveal {
  startedAt: number;
  stepMs: number;
  steps: BrainDrawRevealStep[];
}

export interface TournamentState {
  matchCounter: number;
  initialized: boolean;
  setup: boolean;
  groupAssignments: BrainGroupAssignments;
  drawReveal: BrainDrawReveal | null;
  updatedAt: number;
  activeMatchIds: Partial<Record<BrainSectionId, string | null>>;
  teams: Map<string, BrainTeam>;
  sections: BrainSection[];
  matches: Map<string, BrainMatch>;
}

export const GROUP_SECTION_ORDER: BrainSectionId[] = [
  "group-a",
  "group-b",
  "out-group",
];

export const PLAYOFF_SECTION_IDS: BrainSectionId[] = [
  "sf1",
  "sf2",
  "third",
  "final",
];

export interface InitTeamInput {
  id: string;
  name: string;
  outOfCompetition: boolean;
}
