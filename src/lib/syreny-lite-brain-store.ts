import {
  computeStandings,
  type BrainStandingsRow,
} from "./syreny-lite-brain-standings";

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
  /** teamId per question; undefined = not played, null = nobody */
  captures: (string | null | undefined)[];
}

export interface BrainSection {
  id: BrainSectionId;
  name: string;
  teamIds: string[];
}

export interface BrainMatchDTO {
  id: string;
  sectionId: BrainSectionId;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  questionCount: number;
  captures: (string | null | undefined)[];
  scoreA: number;
  scoreB: number;
  complete: boolean;
}

export interface BrainSectionDTO {
  id: BrainSectionId;
  name: string;
  teamIds: string[];
  standings: BrainStandingsRow[];
  matches: BrainMatchDTO[];
}

export interface BrainTournamentDTO {
  initialized: boolean;
  updatedAt: number;
  activeMatchId: string | null;
  teams: BrainTeam[];
  sections: BrainSectionDTO[];
}

type Listener = (state: BrainTournamentDTO) => void;

interface TournamentState {
  initialized: boolean;
  updatedAt: number;
  activeMatchId: string | null;
  teams: Map<string, BrainTeam>;
  sections: BrainSection[];
  matches: Map<string, BrainMatch>;
}

const TOURNAMENT_KEY = "syreny-lite";

const g = globalThis as unknown as {
  __syrenyBrain?: TournamentState;
  __syrenyBrainListeners?: Set<Listener>;
};

function emptyState(): TournamentState {
  return {
    initialized: false,
    updatedAt: Date.now(),
    activeMatchId: null,
    teams: new Map(),
    sections: [],
    matches: new Map(),
  };
}

if (!g.__syrenyBrain) g.__syrenyBrain = emptyState();
if (!g.__syrenyBrainListeners) g.__syrenyBrainListeners = new Set();

const state = g.__syrenyBrain;
const listeners = g.__syrenyBrainListeners;

function teamName(id: string): string {
  return state.teams.get(id)?.name ?? id;
}

function matchScores(m: BrainMatch): { scoreA: number; scoreB: number } {
  let scoreA = 0;
  let scoreB = 0;
  for (const cap of m.captures) {
    if (cap === m.teamAId) scoreA++;
    else if (cap === m.teamBId) scoreB++;
  }
  return { scoreA, scoreB };
}

function matchComplete(m: BrainMatch): boolean {
  return m.captures.length === m.questionCount && m.captures.every((c) => c !== undefined);
}

function toMatchDTO(m: BrainMatch): BrainMatchDTO {
  const { scoreA, scoreB } = matchScores(m);
  return {
    id: m.id,
    sectionId: m.sectionId,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    teamAName: teamName(m.teamAId),
    teamBName: teamName(m.teamBId),
    questionCount: m.questionCount,
    captures: [...m.captures],
    scoreA,
    scoreB,
    complete: matchComplete(m),
  };
}

function sectionMatches(sectionId: BrainSectionId): BrainMatch[] {
  return [...state.matches.values()].filter((m) => m.sectionId === sectionId);
}

function buildDTO(): BrainTournamentDTO {
  const teams = [...state.teams.values()];
  const sections: BrainSectionDTO[] = state.sections.map((sec) => {
    const matches = sectionMatches(sec.id);
    const matchInputs = matches.map((m) => {
      const { scoreA, scoreB } = matchScores(m);
      return {
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        scoreA,
        scoreB,
        complete: matchComplete(m),
      };
    });
    const names: Record<string, string> = {};
    for (const id of sec.teamIds) names[id] = teamName(id);
    return {
      id: sec.id,
      name: sec.name,
      teamIds: [...sec.teamIds],
      standings: computeStandings(sec.teamIds, names, matchInputs),
      matches: matches.map(toMatchDTO),
    };
  });

  return {
    initialized: state.initialized,
    updatedAt: state.updatedAt,
    activeMatchId: state.activeMatchId,
    teams,
    sections,
  };
}

function broadcast() {
  const dto = buildDTO();
  for (const fn of listeners) {
    try {
      fn(dto);
    } catch {}
  }
}

function touch() {
  state.updatedAt = Date.now();
  broadcast();
}

export function getBrainTournamentState(): BrainTournamentDTO {
  return buildDTO();
}

export function subscribeBrainTournament(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function roundRobinPairs(teamIds: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairs;
}

let matchCounter = 0;
function newMatchId(): string {
  matchCounter++;
  return `m-${matchCounter}-${Date.now()}`;
}

function addRoundRobinSection(
  sectionId: BrainSectionId,
  name: string,
  teamIds: string[],
  questionCount: number,
) {
  state.sections.push({ id: sectionId, name, teamIds: [...teamIds] });
  for (const [a, b] of roundRobinPairs(teamIds)) {
    const mid = newMatchId();
    state.matches.set(mid, {
      id: mid,
      sectionId,
      teamAId: a,
      teamBId: b,
      questionCount,
      captures: Array(questionCount).fill(undefined),
    });
  }
}

function addKnockoutMatch(
  sectionId: BrainSectionId,
  teamAId: string,
  teamBId: string,
  questionCount: number,
) {
  const mid = newMatchId();
  state.matches.set(mid, {
    id: mid,
    sectionId,
    teamAId,
    teamBId,
    questionCount,
    captures: Array(questionCount).fill(undefined),
  });
  return mid;
}

export interface InitTeamInput {
  id: string;
  name: string;
  outOfCompetition: boolean;
}

export function initBrainTournament(teams: InitTeamInput[]): boolean {
  Object.assign(state, emptyState());
  matchCounter = 0;

  for (const t of teams) {
    state.teams.set(t.id, {
      id: t.id,
      name: t.name,
      outOfCompetition: t.outOfCompetition,
    });
  }

  const main = teams.filter((t) => !t.outOfCompetition);
  const ooc = teams.filter((t) => t.outOfCompetition);

  const groupA = main.slice(0, 5).map((t) => t.id);
  const groupB = main.slice(5, 10).map((t) => t.id);
  const oocGroup = ooc.slice(0, 4).map((t) => t.id);

  if (groupA.length > 0) {
    addRoundRobinSection("group-a", "Группа A", groupA, 5);
  }
  if (groupB.length > 0) {
    addRoundRobinSection("group-b", "Группа B", groupB, 5);
  }
  if (oocGroup.length > 0) {
    addRoundRobinSection("out-group", "Вне зачёта", oocGroup, 5);
  }

  // Playoff placeholders — teams assigned later
  state.sections.push({ id: "sf1", name: "Полуфинал 1", teamIds: [] });
  state.sections.push({ id: "sf2", name: "Полуфинал 2", teamIds: [] });
  state.sections.push({ id: "third", name: "Бой за 3-е место", teamIds: [] });
  state.sections.push({ id: "final", name: "Финал", teamIds: [] });

  const placeholder = "tbd";
  if (!state.teams.has(placeholder)) {
    state.teams.set(placeholder, {
      id: placeholder,
      name: "—",
      outOfCompetition: false,
    });
  }

  addKnockoutMatch("sf1", placeholder, placeholder, 7);
  addKnockoutMatch("sf2", placeholder, placeholder, 7);
  addKnockoutMatch("third", placeholder, placeholder, 7);
  addKnockoutMatch("final", placeholder, placeholder, 9);

  state.initialized = true;
  state.activeMatchId = [...state.matches.keys()][0] ?? null;
  touch();
  return true;
}

export function setActiveMatch(matchId: string | null): boolean {
  if (matchId !== null && !state.matches.has(matchId)) return false;
  state.activeMatchId = matchId;
  touch();
  return true;
}

export function setCapture(
  matchId: string,
  questionIndex: number,
  teamId: string | null,
): boolean {
  const m = state.matches.get(matchId);
  if (!m) return false;
  if (questionIndex < 0 || questionIndex >= m.questionCount) return false;
  if (teamId !== null && teamId !== m.teamAId && teamId !== m.teamBId) {
    return false;
  }
  m.captures[questionIndex] = teamId;
  touch();
  return true;
}

export function setPlayoffTeams(
  matchId: string,
  teamAId: string,
  teamBId: string,
): boolean {
  const m = state.matches.get(matchId);
  if (!m) return false;
  if (!state.teams.has(teamAId) || !state.teams.has(teamBId)) return false;
  if (teamAId === "tbd" || teamBId === "tbd") {
    // allow replacing placeholders with real teams
  }
  m.teamAId = teamAId;
  m.teamBId = teamBId;
  m.captures = Array(m.questionCount).fill(undefined);

  const sec = state.sections.find((s) => s.id === m.sectionId);
  if (sec) {
    const ids = new Set(sec.teamIds);
    if (teamAId !== "tbd") ids.add(teamAId);
    if (teamBId !== "tbd") ids.add(teamBId);
    sec.teamIds = [...ids].filter((id) => id !== "tbd");
  }
  touch();
  return true;
}

export function advancePlayoffFromGroups(): boolean {
  const dto = buildDTO();
  const ga = dto.sections.find((s) => s.id === "group-a");
  const gb = dto.sections.find((s) => s.id === "group-b");
  if (!ga || !gb || ga.standings.length < 2 || gb.standings.length < 2) {
    return false;
  }

  const a1 = ga.standings[0].teamId;
  const a2 = ga.standings[1].teamId;
  const b1 = gb.standings[0].teamId;
  const b2 = gb.standings[1].teamId;

  const sf1 = sectionMatches("sf1")[0];
  const sf2 = sectionMatches("sf2")[0];
  if (!sf1 || !sf2) return false;

  setPlayoffTeams(sf1.id, a1, b2);
  setPlayoffTeams(sf2.id, b1, a2);
  return true;
}

export function resetBrainTournament(): void {
  Object.assign(state, emptyState());
  touch();
}
