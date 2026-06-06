import {
  computeStandings,
  type BrainStandingsRow,
} from "./syreny-lite-brain-standings";
import { scheduleRoundRobinNoBackToBack } from "./syreny-lite-brain-schedule";
import {
  deleteBrainStateFromDb,
  loadBrainStateFromDb,
  saveBrainStateToDb,
} from "./syreny-lite-brain-persist";
import {
  loadSyrenyLiteBrainTeams,
  resolveSyrenyLiteBrainSeedAssignments,
} from "./syreny-lite-brain-seed";
import {
  GROUP_SECTION_ORDER,
  PLAYOFF_SECTION_IDS,
  type BrainDrawReveal,
  type BrainDrawRevealStep,
  type BrainDrawGroupKey,
  type BrainGroupAssignments,
  type BrainMatch,
  type BrainSection,
  type BrainSectionId,
  type BrainTeam,
  type InitTeamInput,
  type TournamentState,
} from "./syreny-lite-brain-store-types";

export type {
  BrainSectionId,
  BrainTeam,
  BrainMatch,
  BrainGroupAssignments,
  BrainDrawGroupKey,
  BrainDrawReveal,
  BrainDrawRevealStep,
  InitTeamInput,
} from "./syreny-lite-brain-store-types";

export interface BrainMatchDTO {
  id: string;
  sectionId: BrainSectionId;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  questionCount: number;
  playOrder: number;
  captures: (string | null | undefined)[];
  scoreA: number;
  scoreB: number;
  complete: boolean;
}

export interface BrainSectionDTO {
  id: BrainSectionId;
  name: string;
  teamIds: string[];
  activeMatchId: string | null;
  standings: BrainStandingsRow[];
  matches: BrainMatchDTO[];
}

export interface BrainTournamentDTO {
  initialized: boolean;
  setup: boolean;
  groupAssignments: BrainGroupAssignments;
  drawReveal: BrainDrawReveal | null;
  updatedAt: number;
  activeMatchIds: Partial<Record<BrainSectionId, string | null>>;
  teams: BrainTeam[];
  sections: BrainSectionDTO[];
}

type Listener = (state: BrainTournamentDTO) => void;

function emptyGroupAssignments(): BrainGroupAssignments {
  return { groupA: [], groupB: [], outGroup: [] };
}

function emptyState(): TournamentState {
  return {
    matchCounter: 0,
    initialized: false,
    setup: false,
    groupAssignments: emptyGroupAssignments(),
    drawReveal: null,
    updatedAt: Date.now(),
    activeMatchIds: {},
    teams: new Map(),
    sections: [],
    matches: new Map(),
  };
}

const g = globalThis as unknown as {
  __syrenyBrain?: TournamentState;
  __syrenyBrainListeners?: Set<Listener>;
  __syrenyBrainHydrated?: boolean;
  __syrenyBrainHydratePromise?: Promise<void>;
};

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
  return (
    m.captures.length === m.questionCount &&
    m.captures.every((c) => c !== undefined)
  );
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
    playOrder: m.playOrder,
    captures: [...m.captures],
    scoreA,
    scoreB,
    complete: matchComplete(m),
  };
}

function sectionMatches(sectionId: BrainSectionId): BrainMatch[] {
  return [...state.matches.values()]
    .filter((m) => m.sectionId === sectionId)
    .sort((a, b) => a.playOrder - b.playOrder);
}

function initDefaultActiveMatches(sectionIds: BrainSectionId[]) {
  for (const sid of sectionIds) {
    const ms = sectionMatches(sid);
    if (ms.length > 0 && state.activeMatchIds[sid] == null) {
      state.activeMatchIds[sid] = ms[0].id;
    }
  }
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
      activeMatchId: state.activeMatchIds[sec.id] ?? null,
      standings: computeStandings(sec.teamIds, names, matchInputs),
      matches: matches.map(toMatchDTO),
    };
  });

  return {
    initialized: state.initialized,
    setup: state.setup,
    groupAssignments: {
      groupA: [...state.groupAssignments.groupA],
      groupB: [...state.groupAssignments.groupB],
      outGroup: [...state.groupAssignments.outGroup],
    },
    drawReveal: state.drawReveal
      ? {
          startedAt: state.drawReveal.startedAt,
          stepMs: state.drawReveal.stepMs,
          steps: state.drawReveal.steps.map((s) => ({ ...s })),
        }
      : null,
    updatedAt: state.updatedAt,
    activeMatchIds: { ...state.activeMatchIds },
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
  if (g.__syrenyBrainHydrated) {
    void saveBrainStateToDb(state).catch(() => {});
  }
}

function hydrateState(saved: TournamentState) {
  state.matchCounter = saved.matchCounter;
  state.initialized = saved.initialized;
  state.setup = saved.setup;
  state.groupAssignments = saved.groupAssignments;
  state.drawReveal = saved.drawReveal;
  state.updatedAt = saved.updatedAt;
  state.activeMatchIds = saved.activeMatchIds;
  state.teams = saved.teams;
  state.sections = saved.sections;
  state.matches = saved.matches;
}

async function seedSyrenyLiteBrainTournament(): Promise<boolean> {
  const teams = await loadSyrenyLiteBrainTeams();
  if (teams.length === 0) return false;

  const resolved = resolveSyrenyLiteBrainSeedAssignments(teams);
  if (typeof resolved === "string") {
    console.error("[brain-ring seed]", resolved);
    return false;
  }

  if (resolved.outGroup.length < 2) {
    console.error("[brain-ring seed] Недостаточно команд вне зачёта для группы");
    return false;
  }

  prepareBrainTournament(teams);
  const err = setBrainGroupAssignments(
    resolved.groupA,
    resolved.groupB,
    resolved.outGroup,
  );
  if (err) {
    console.error("[brain-ring seed]", err);
    return false;
  }
  const startErr = startBrainTournament();
  if (startErr) {
    console.error("[brain-ring seed]", startErr);
    return false;
  }
  return true;
}

export async function ensureBrainTournamentLoaded(): Promise<void> {
  if (g.__syrenyBrainHydrated) return;
  if (!g.__syrenyBrainHydratePromise) {
    g.__syrenyBrainHydratePromise = (async () => {
      const saved = await loadBrainStateFromDb();
      if (saved) {
        hydrateState(saved);
      } else {
        await seedSyrenyLiteBrainTournament();
      }
      g.__syrenyBrainHydrated = true;
      broadcast();
    })();
  }
  await g.__syrenyBrainHydratePromise;
}

export function getBrainTournamentState(): BrainTournamentDTO {
  return buildDTO();
}

export function subscribeBrainTournament(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function newMatchId(): string {
  state.matchCounter++;
  return `m-${state.matchCounter}-${Date.now()}`;
}

function addRoundRobinSection(
  sectionId: BrainSectionId,
  name: string,
  teamIds: string[],
  questionCount: number,
) {
  state.sections.push({ id: sectionId, name, teamIds: [...teamIds] });
  const pairs = scheduleRoundRobinNoBackToBack(teamIds);
  pairs.forEach(([a, b], idx) => {
    const mid = newMatchId();
    state.matches.set(mid, {
      id: mid,
      sectionId,
      teamAId: a,
      teamBId: b,
      questionCount,
      playOrder: idx + 1,
      captures: Array(questionCount).fill(undefined),
    });
  });
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
    playOrder: 1,
    captures: Array(questionCount).fill(undefined),
  });
  return mid;
}

function ensurePlaceholderTeam() {
  const placeholder = "tbd";
  if (!state.teams.has(placeholder)) {
    state.teams.set(placeholder, {
      id: placeholder,
      name: "—",
      outOfCompetition: false,
    });
  }
}

function addPlayoffSections() {
  state.sections.push({ id: "sf1", name: "Полуфинал 1", teamIds: [] });
  state.sections.push({ id: "sf2", name: "Полуфинал 2", teamIds: [] });
  state.sections.push({ id: "third", name: "Бой за 3-е место", teamIds: [] });
  state.sections.push({ id: "final", name: "Финал", teamIds: [] });
  ensurePlaceholderTeam();
  addKnockoutMatch("sf1", "tbd", "tbd", 7);
  addKnockoutMatch("sf2", "tbd", "tbd", 7);
  addKnockoutMatch("third", "tbd", "tbd", 7);
  addKnockoutMatch("final", "tbd", "tbd", 9);
}

function validateGroupAssignments(
  groupA: string[],
  groupB: string[],
  outGroup: string[],
): string | null {
  const all = [...groupA, ...groupB, ...outGroup];
  const seen = new Set<string>();
  for (const id of all) {
    if (!state.teams.has(id) || id === "tbd") {
      return `Неизвестная команда: ${id}`;
    }
    if (seen.has(id)) return "Команда не может быть в двух группах";
    seen.add(id);
  }
  const groups = [
    { name: "Группа A", ids: groupA },
    { name: "Группа B", ids: groupB },
    { name: "Вне зачёта", ids: outGroup },
  ].filter((g) => g.ids.length > 0);
  if (groups.length === 0) return "Назначьте хотя бы одну команду в группу";
  for (const g of groups) {
    if (g.ids.length < 2) {
      return `${g.name}: нужно минимум 2 команды для кругового турнира`;
    }
  }
  return null;
}

export function prepareBrainTournament(teams: InitTeamInput[]): boolean {
  Object.assign(state, emptyState());
  g.__syrenyBrainHydrated = true;

  for (const t of teams) {
    state.teams.set(t.id, {
      id: t.id,
      name: t.name,
      outOfCompetition: t.outOfCompetition,
    });
  }

  state.setup = true;
  touch();
  return true;
}

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleDrawSteps(steps: BrainDrawRevealStep[]): BrainDrawRevealStep[] {
  const a = [...steps];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildShuffledDrawSteps(
  groupA: string[],
  groupB: string[],
  outGroup: string[],
): BrainDrawRevealStep[] {
  const steps: BrainDrawRevealStep[] = [
    ...groupA.map((teamId) => ({ teamId, group: "groupA" as const })),
    ...groupB.map((teamId) => ({ teamId, group: "groupB" as const })),
    ...outGroup.map((teamId) => ({ teamId, group: "outGroup" as const })),
  ];
  return shuffleDrawSteps(steps);
}

export function setBrainGroupAssignments(
  groupA: string[],
  groupB: string[],
  outGroup: string[],
): string | null {
  if (!state.setup || state.initialized) {
    return "Турнир уже начат";
  }
  const err = validateGroupAssignments(groupA, groupB, outGroup);
  if (err) return err;
  state.drawReveal = null;
  state.groupAssignments = {
    groupA: [...groupA],
    groupB: [...groupB],
    outGroup: [...outGroup],
  };
  touch();
  return null;
}

const DRAW_STEP_MS = 700;

export function drawBrainGroups(selectedIds: string[]): string | null {
  if (!state.setup || state.initialized) {
    return "Турнир уже начат или настройка не начата";
  }

  const selected = selectedIds.filter(
    (id) => state.teams.has(id) && id !== "tbd",
  );
  if (selected.length === 0) {
    return "Отметьте команды для жеребьёвки";
  }

  const main: string[] = [];
  const ooc: string[] = [];
  for (const id of selected) {
    const t = state.teams.get(id)!;
    if (t.outOfCompetition) ooc.push(id);
    else main.push(id);
  }

  const shuffledMain = shuffleIds(main);
  const shuffledOoc = shuffleIds(ooc);

  const groupA = shuffledMain.slice(0, 5);
  const groupB = shuffledMain.slice(5, 10);
  const outGroup = shuffledOoc.slice(0, 4);

  const err = validateGroupAssignments(groupA, groupB, outGroup);
  if (err) return err;

  state.groupAssignments = { groupA, groupB, outGroup };
  state.drawReveal = {
    startedAt: Date.now(),
    stepMs: DRAW_STEP_MS,
    steps: buildShuffledDrawSteps(groupA, groupB, outGroup),
  };
  touch();
  return null;
}

export function startBrainTournament(): string | null {
  if (!state.setup || state.initialized) {
    return "Турнир уже начат или настройка не начата";
  }
  const { groupA, groupB, outGroup } = state.groupAssignments;
  const err = validateGroupAssignments(groupA, groupB, outGroup);
  if (err) return err;

  state.sections = [];
  state.matches.clear();
  state.activeMatchIds = {};

  if (groupA.length > 0) {
    addRoundRobinSection("group-a", "Группа A", groupA, 5);
  }
  if (groupB.length > 0) {
    addRoundRobinSection("group-b", "Группа B", groupB, 5);
  }
  if (outGroup.length > 0) {
    addRoundRobinSection("out-group", "Вне зачёта", outGroup, 5);
  }

  addPlayoffSections();

  initDefaultActiveMatches([...GROUP_SECTION_ORDER, ...PLAYOFF_SECTION_IDS]);

  state.drawReveal = null;
  state.setup = false;
  state.initialized = true;
  touch();
  return null;
}

export function setSectionActiveMatch(
  sectionId: BrainSectionId,
  matchId: string | null,
): boolean {
  if (matchId !== null) {
    const m = state.matches.get(matchId);
    if (!m || m.sectionId !== sectionId) return false;
  }
  state.activeMatchIds[sectionId] = matchId;
  touch();
  return true;
}

/** @deprecated Use setSectionActiveMatch */
export function setActiveMatch(matchId: string | null): boolean {
  if (matchId === null) return false;
  const m = state.matches.get(matchId);
  if (!m) return false;
  return setSectionActiveMatch(m.sectionId, matchId);
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

export async function resetBrainTournament(): Promise<void> {
  Object.assign(state, emptyState());
  g.__syrenyBrainHydrated = true;
  await deleteBrainStateFromDb();
  touch();
}

export function initBrainTournament(teams: InitTeamInput[]): boolean {
  if (!prepareBrainTournament(teams)) return false;
  const main = teams.filter((t) => !t.outOfCompetition);
  const ooc = teams.filter((t) => t.outOfCompetition);
  state.groupAssignments = {
    groupA: main.slice(0, 5).map((t) => t.id),
    groupB: main.slice(5, 10).map((t) => t.id),
    outGroup: ooc.slice(0, 4).map((t) => t.id),
  };
  return startBrainTournament() === null;
}
