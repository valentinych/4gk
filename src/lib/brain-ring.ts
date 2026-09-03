import type { Prisma } from "@prisma/client";
import { computeStandings } from "@/lib/syreny-lite-brain-standings";
import {
  MAX_GROUP_COUNT,
  MAX_GROUP_SIZE,
  MAX_MATCH_SIZE,
  MAX_TEAM_COUNT,
  MIN_GROUP_COUNT,
  MIN_GROUP_SIZE,
  MIN_MATCH_SIZE,
  MIN_TEAM_COUNT,
  SOPOT_FINAL_Q,
  SOPOT_GROUP_COUNT,
  SOPOT_GROUP_SIZE,
  SOPOT_REMATRIX,
  SOPOT_STAGE1_LETTERS,
  SOPOT_STAGE1_Q,
  SOPOT_STAGE2_Q,
  SOPOT_TEAM_COUNT,
  generateDoubleElim,
  generateOlympic,
  groupLetters,
  isBrainPreset,
  isSopotPreset,
  nwayPoints,
  roundRobinMatches,
  slotsToMatches,
  type BrainGenMatch,
  type BrainPresetId,
  type BrainSlotSource,
} from "@/lib/brain-ring-presets";
import {
  pairCount,
  placeCode,
  playingTeamIds,
  rematrixSources,
  sopotAdvancingIds,
  sopotCombinedStandings,
  sopotGroupStandings,
  sopotStage1Groups,
  uniqueTeamAtPlace,
} from "@/lib/brain-ring-sopot";

export {
  PRESET_LABELS,
  SOPOT_REMATRIX,
  SOPOT_STAGE1_LETTERS,
  SOPOT_STAGE2_LETTERS,
  generateDoubleElim,
  generateOlympic,
  isSopotPreset,
  nwayPoints,
  roundRobinMatches,
  type BrainPresetId,
  type BrainSlotSource,
} from "@/lib/brain-ring-presets";
export {
  playingTeamIds,
  sopotCombinedStandings,
  sopotFillFinal,
  sopotFillStage2,
  sopotGroupStandings,
  sopotStage1Groups,
  sopotStage2Groups,
  lotteryOrderFromRows,
  tiedClusters,
} from "@/lib/brain-ring-sopot";

export const BRAIN_TEMPLATE_OCHP_16 = "ochp-16";
export const BRAIN_GROUP_COUNT = 4;
export const BRAIN_TEAMS_PER_GROUP = 4;
export const BRAIN_TEAM_COUNT = BRAIN_GROUP_COUNT * BRAIN_TEAMS_PER_GROUP;
export const DEFAULT_QUESTION_COUNT = 7;
export const GROUP_LETTERS = ["A", "B", "C", "D"] as const;

export const ROUND_LABELS: Record<string, string> = {
  "1/16": "1/16",
  "1/8": "1/8",
  "1/4": "1/4",
  "1/2": "Полуфинал",
  "3rd": "За 3-е место",
  Final: "Финал",
  "WB 1/16": "Победители · 1/16",
  "WB 1/8": "Победители · 1/8",
  "WB 1/4": "Победители · 1/4",
  "WB 1/2": "Победители · 1/2",
  "WB Final": "Победители · финал",
  "LB 1": "Проигравшие · раунд 1",
  "LB 2": "Проигравшие · раунд 2",
  "LB 3": "Проигравшие · раунд 3",
  "LB 4": "Проигравшие · раунд 4",
  "LB 5": "Проигравшие · раунд 5",
  "LB 6": "Проигравшие · раунд 6",
  GF: "Гранд-финал",
};

export const STAGE_TYPE_LABELS: Record<string, string> = {
  groups: "Круговой турнир в группах",
  playoff: "Плей-офф",
  rr: "Круговой турнир",
  bracket: "Сетка",
};

/** `false` = unanswered; team id = that team took the question. */
export type BrainCapture = string | false;

export type BrainMatchStatus = "idle" | "started" | "finished";

export interface BrainRingTeam {
  id: string;
  name: string;
}

export interface BrainRingGroupScheme {
  id: string;
  letter: string;
  letterName: string;
  venue: string;
  time: string;
  teamIds: string[];
  /** Stage-2 rematrix: fill from stage-1 places. */
  sources?: BrainSlotSource[];
  /** Moderator lottery order (best first). Last resort only; not teamId. */
  tieBreak?: string[];
}

export interface BrainRingPlayoffSlot {
  id: string;
  round: string;
  venue: string;
  questionCount: number;
  teamA: BrainSlotSource;
  teamB: BrainSlotSource;
}

export interface BrainRingGroupsStage {
  id: string;
  name: string;
  type: "groups";
  questionCount: number;
  groups: BrainRingGroupScheme[];
}

export interface BrainRingPlayoffStage {
  id: string;
  name: string;
  type: "playoff";
  questionCount: number;
  slots: BrainRingPlayoffSlot[];
}

export interface BrainRingRrStage {
  id: string;
  name: string;
  type: "rr";
  questionCount: number;
  matchSize: number;
  teamIds: string[];
  sources?: BrainSlotSource[];
}

export interface BrainRingBracketStage {
  id: string;
  name: string;
  type: "bracket";
  questionCount: number;
  slots: BrainRingPlayoffSlot[];
}

export type BrainRingStage =
  | BrainRingGroupsStage
  | BrainRingPlayoffStage
  | BrainRingRrStage
  | BrainRingBracketStage;

export interface BrainRingScheme {
  preset: BrainPresetId;
  /** @deprecated alias of preset; kept so old OCHP JSON / DB column still read. */
  template: string;
  questionCount: number;
  matchSize: number;
  teamCount: number;
  thirdPlace: boolean;
  groupCount: number;
  groupSize: number;
  teams: BrainRingTeam[];
  stages: BrainRingStage[];
  /** Moderator lottery for the combined table of 16 (best first). */
  overallTieBreak?: string[];
}

export interface BrainRingMatchRow {
  slotId: string;
  sectionId: string;
  kind: "group" | "finals" | "rr" | "bracket";
  round: string;
  venue: string;
  teamIds: string[];
  teamAId: string;
  teamBId: string;
  playOrder: number;
  questionCount: number;
  scores: { captures: BrainCapture[]; teamIds: string[] };
  active: boolean;
}

export interface BrainRingMatchDto {
  id: string;
  slotId: string;
  sectionId: string;
  kind: "group" | "finals" | "rr" | "bracket";
  round: string;
  venue: string;
  teamIds: string[];
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamNames: string[];
  playOrder: number;
  questionCount: number;
  captures: BrainCapture[];
  scores: number[];
  scoreA: number;
  scoreB: number;
  complete: boolean;
  finished: boolean;
  status: BrainMatchStatus;
  active: boolean;
  currentQuestion: number;
}

export interface BrainRingPublicGroup {
  letter: string;
  letterName: string;
  venue: string;
  time: string;
  section?: string;
  highlightTop?: number;
  outLast?: boolean;
  isCombined?: boolean;
  placeholder?: boolean;
  teams: Array<{
    pos: string;
    name: string;
    played: number;
    win: number;
    draw: number;
    lost: number;
    gf: number;
    ga: number;
    diff: number;
    points: number;
  }>;
}

const OCHP_16_PLAYOFF: ReadonlyArray<{
  id: string;
  round: string;
  teamA: BrainSlotSource;
  teamB: BrainSlotSource;
}> = [
  { id: "sf1", round: "1/2", teamA: { kind: "place", group: "A", place: 1 }, teamB: { kind: "place", group: "D", place: 1 } },
  { id: "sf2", round: "1/2", teamA: { kind: "place", group: "B", place: 1 }, teamB: { kind: "place", group: "C", place: 1 } },
  { id: "third", round: "3rd", teamA: { kind: "loser", slotId: "sf1" }, teamB: { kind: "loser", slotId: "sf2" } },
  { id: "final", round: "Final", teamA: { kind: "winner", slotId: "sf1" }, teamB: { kind: "winner", slotId: "sf2" } },
];

export function emptyCaptures(n: number): BrainCapture[] {
  return Array.from({ length: Math.max(1, n) }, () => false);
}

export function clampQuestionCount(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_QUESTION_COUNT;
  return Math.min(15, Math.max(1, Math.round(n)));
}

function clampMatchSize(raw: unknown, fallback = 2): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_MATCH_SIZE, Math.max(MIN_MATCH_SIZE, Math.round(n)));
}

export function allGroups(scheme: BrainRingScheme): BrainRingGroupScheme[] {
  return scheme.stages.flatMap((s) => (s.type === "groups" ? s.groups : []));
}

export function playoffSlots(scheme: BrainRingScheme): BrainRingPlayoffSlot[] {
  return scheme.stages.flatMap((s) => (s.type === "playoff" || s.type === "bracket" ? s.slots : []));
}

export function playoffSourceLabel(src: BrainSlotSource): string {
  if (src.kind === "place") return `${src.group}${src.place}`;
  if (src.kind === "overall") return `${src.place}-е место общей таблицы`;
  if (src.kind === "team") return teamLabel("", src.teamId);
  if (src.kind === "bye") return "bye";
  const slot = src.slotId;
  return src.kind === "winner" ? `Победитель ${slot}` : `Проигравший ${slot}`;
}

function makeTeams(count: number, names?: string[], prev?: BrainRingTeam[]): BrainRingTeam[] {
  const n = Math.min(MAX_TEAM_COUNT, Math.max(MIN_TEAM_COUNT, count));
  return Array.from({ length: n }, (_, i) => ({
    id: prev?.[i]?.id ?? `t${i + 1}`,
    name: names?.[i]?.trim() ?? prev?.[i]?.name ?? "",
  }));
}

function ochpGroups(teams: BrainRingTeam[]): BrainRingGroupScheme[] {
  return GROUP_LETTERS.map((letter, gi) => ({
    id: letter,
    letter,
    letterName: "",
    venue: "",
    time: "",
    teamIds: teams.slice(gi * BRAIN_TEAMS_PER_GROUP, gi * BRAIN_TEAMS_PER_GROUP + BRAIN_TEAMS_PER_GROUP).map((t) => t.id),
  }));
}

function prevStage(prev: BrainRingScheme | undefined, id: string): BrainRingStage | undefined {
  return prev?.stages.find((s) => s.id === id);
}

function prevGroup(prev: BrainRingScheme | undefined, letter: string): BrainRingGroupScheme | undefined {
  return prev ? allGroups(prev).find((g) => g.letter === letter) : undefined;
}

function sopotStages(teams: BrainRingTeam[], prev?: BrainRingScheme): BrainRingStage[] {
  const ids = teams.map((t) => t.id);
  const s1 = prevStage(prev, "stage1");
  const s2 = prevStage(prev, "stage2");
  const fin = prevStage(prev, "final");
  const q1 = clampQuestionCount(s1?.questionCount ?? SOPOT_STAGE1_Q);
  const q2 = clampQuestionCount(s2?.questionCount ?? SOPOT_STAGE2_Q);
  const qf = clampQuestionCount(fin?.questionCount ?? SOPOT_FINAL_Q);

  const stage1Groups: BrainRingGroupScheme[] = SOPOT_STAGE1_LETTERS.map((letter, gi) => {
    const prevG = prevGroup(prev, letter);
    const fallback = ids.slice(gi * SOPOT_GROUP_SIZE, gi * SOPOT_GROUP_SIZE + SOPOT_GROUP_SIZE);
    const teamIds = (prevG?.teamIds ?? fallback).slice(0, SOPOT_GROUP_SIZE);
    while (teamIds.length < SOPOT_GROUP_SIZE) {
      const next = fallback.find((id) => !teamIds.includes(id));
      teamIds.push(next ?? `t${gi * SOPOT_GROUP_SIZE + teamIds.length + 1}`);
    }
    return {
      id: letter,
      letter,
      letterName: prevG?.letterName ?? "",
      venue: prevG?.venue ?? "",
      time: prevG?.time ?? "",
      teamIds,
      tieBreak: prevG?.tieBreak,
    };
  });

  const stage2Groups: BrainRingGroupScheme[] = SOPOT_REMATRIX.map((row) => {
    const prevG = prevGroup(prev, row.letter);
    return {
      id: row.letter,
      letter: row.letter,
      letterName: prevG?.letterName ?? "",
      venue: prevG?.venue ?? "",
      time: prevG?.time ?? "",
      teamIds: prevG?.teamIds?.slice(0, 4) ?? [],
      sources: rematrixSources(row.letter),
      tieBreak: prevG?.tieBreak,
    };
  });

  const finalTeamIds = fin && fin.type === "rr" ? fin.teamIds.slice(0, 4) : [];

  return [
    { id: "stage1", name: "Первый групповой этап", type: "groups", questionCount: q1, groups: stage1Groups },
    { id: "stage2", name: "Второй групповой этап", type: "groups", questionCount: q2, groups: stage2Groups },
    {
      id: "final",
      name: "Финал",
      type: "rr",
      questionCount: qf,
      matchSize: 4,
      teamIds: finalTeamIds,
      sources: [
        { kind: "overall", place: 1 },
        { kind: "overall", place: 2 },
        { kind: "overall", place: 3 },
        { kind: "overall", place: 4 },
      ],
    },
  ];
}

function asPlayoffSlot(
  id: string,
  round: string,
  sources: BrainSlotSource[],
  questionCount: number,
  venue = "",
): BrainRingPlayoffSlot {
  return {
    id,
    round,
    venue,
    questionCount,
    teamA: sources[0] ?? { kind: "bye" },
    teamB: sources[1] ?? { kind: "bye" },
  };
}

export function emptyScheme(
  preset: BrainPresetId,
  opts?: {
    questionCount?: number;
    matchSize?: number;
    teamCount?: number;
    thirdPlace?: boolean;
    groupCount?: number;
    groupSize?: number;
    names?: string[];
    prev?: BrainRingScheme;
  },
): BrainRingScheme {
  const q = clampQuestionCount(opts?.questionCount ?? opts?.prev?.questionCount ?? DEFAULT_QUESTION_COUNT);
  const thirdPlace = opts?.thirdPlace ?? opts?.prev?.thirdPlace ?? true;
  let groupSize = clampInt(opts?.groupSize ?? opts?.prev?.groupSize ?? 4, MIN_GROUP_SIZE, MAX_GROUP_SIZE);
  let groupCount = clampInt(opts?.groupCount ?? opts?.prev?.groupCount ?? 2, MIN_GROUP_COUNT, MAX_GROUP_COUNT);
  let matchSize = clampMatchSize(opts?.matchSize ?? opts?.prev?.matchSize ?? (preset === "nway" ? 3 : 2), preset === "nway" ? 3 : 2);
  if (preset === "olympic" || preset === "double-elim" || preset === "ochp-16" || preset === "sopot") matchSize = 2;

  let teamCount = clampInt(opts?.teamCount ?? opts?.prev?.teamCount ?? 8, MIN_TEAM_COUNT, MAX_TEAM_COUNT);
  if (preset === "ochp-16") {
    teamCount = BRAIN_TEAM_COUNT;
    groupCount = BRAIN_GROUP_COUNT;
    groupSize = BRAIN_TEAMS_PER_GROUP;
    matchSize = 2;
  } else if (preset === "sopot") {
    teamCount = SOPOT_TEAM_COUNT;
    groupCount = SOPOT_GROUP_COUNT;
    groupSize = SOPOT_GROUP_SIZE;
    matchSize = 2;
  } else if (preset === "groups") {
    teamCount = groupCount * groupSize;
  } else if (preset === "nway") {
    teamCount = Math.max(matchSize, teamCount);
  }

  const teams = makeTeams(teamCount, opts?.names, opts?.prev?.teams);
  const stages = stagesForPreset(preset, {
    questionCount: q,
    matchSize,
    thirdPlace,
    groupCount,
    groupSize,
    teams,
    prev: opts?.prev,
  });

  return {
    preset,
    template: preset,
    questionCount: preset === "sopot" ? SOPOT_STAGE1_Q : q,
    matchSize,
    teamCount: teams.length,
    thirdPlace: preset === "sopot" ? false : thirdPlace,
    groupCount,
    groupSize,
    teams,
    stages,
    overallTieBreak: preset === "sopot" ? opts?.prev?.overallTieBreak : undefined,
  };
}

function stagesForPreset(
  preset: BrainPresetId,
  p: {
    questionCount: number;
    matchSize: number;
    thirdPlace: boolean;
    groupCount: number;
    groupSize: number;
    teams: BrainRingTeam[];
    prev?: BrainRingScheme;
  },
): BrainRingStage[] {
  const q = p.questionCount;
  const ids = p.teams.map((t) => t.id);

  if (preset === "sopot") {
    return sopotStages(p.teams, p.prev);
  }

  if (preset === "ochp-16") {
    return [
      { id: "groups", name: "Групповой этап", type: "groups", questionCount: q, groups: ochpGroups(p.teams) },
      {
        id: "finals",
        name: "Финальный этап",
        type: "playoff",
        questionCount: q,
        slots: OCHP_16_PLAYOFF.map((s) => asPlayoffSlot(s.id, s.round, [s.teamA, s.teamB], q)),
      },
    ];
  }

  if (preset === "olympic") {
    const slots = generateOlympic(ids, p.thirdPlace);
    return [
      {
        id: "bracket",
        name: "Олимпийская сетка",
        type: "bracket",
        questionCount: q,
        slots: slots.map((s) => asPlayoffSlot(s.id, s.round, s.sources, q)),
      },
    ];
  }

  if (preset === "double-elim") {
    const slots = generateDoubleElim(ids);
    return [
      {
        id: "bracket",
        name: "Double Elimination",
        type: "bracket",
        questionCount: q,
        slots: slots.map((s) => asPlayoffSlot(s.id, s.round, s.sources, q)),
      },
    ];
  }

  if (preset === "groups") {
    const letters = groupLetters(p.groupCount);
    const groups: BrainRingGroupScheme[] = letters.map((letter, gi) => ({
      id: letter,
      letter,
      letterName: "",
      venue: "",
      time: "",
      teamIds: ids.slice(gi * p.groupSize, gi * p.groupSize + p.groupSize),
    }));
    return [{ id: "groups", name: "Групповой этап", type: "groups", questionCount: q, groups }];
  }

  if (preset === "nway") {
    return [
      {
        id: "rr",
        name: `Бои по ${p.matchSize}`,
        type: "rr",
        questionCount: q,
        matchSize: p.matchSize,
        teamIds: ids,
      },
    ];
  }

  return [
    {
      id: "rr",
      name: "Общая группа",
      type: "rr",
      questionCount: q,
      matchSize: p.matchSize,
      teamIds: ids,
    },
  ];
}

function clampInt(raw: unknown, min: number, max: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function emptyOchp16Scheme(names?: string[]): BrainRingScheme {
  return emptyScheme("ochp-16", { names });
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function parseCaptures(raw: unknown, questionCount: number): BrainCapture[] {
  const n = clampQuestionCount(questionCount);
  const src = Array.isArray(raw) ? raw : [];
  return Array.from({ length: n }, (_, i) => {
    const c = src[i];
    if (typeof c === "string" && c) return c;
    return false;
  });
}

export function parseTeamIdsFromScores(raw: unknown, teamAId: string, teamBId: string): string[] {
  const rec = asRecord(raw);
  const fromJson = Array.isArray(rec?.teamIds)
    ? rec.teamIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (fromJson.length >= 2) return fromJson.slice(0, MAX_MATCH_SIZE);
  return [teamAId, teamBId].filter(Boolean);
}

export function matchScores(captures: BrainCapture[], teamIds: string[]): number[] {
  return teamIds.map((id) => captures.filter((c) => c === id).length);
}

export function matchComplete(captures: BrainCapture[]): boolean {
  return captures.length > 0 && captures.every((c) => typeof c === "string" && c.length > 0);
}

export function parseMatchStatus(scores: unknown, active: boolean, questionCount: number): BrainMatchStatus {
  const rec = asRecord(scores);
  if (rec?.status === "finished" || rec?.status === "started" || rec?.status === "idle") {
    return rec.status;
  }
  if (matchComplete(parseCaptures(rec?.captures, questionCount))) return "finished";
  if (active) return "started";
  return "idle";
}

export function currentQuestionIndex(captures: BrainCapture[]): number {
  const i = captures.findIndex((c) => c === false);
  return i < 0 ? captures.length : i;
}

export function teamLabel(name: string, fallbackId: string): string {
  const n = name.trim();
  if (n) return n;
  if (!fallbackId) return "—";
  const m = /^t(\d+)$/.exec(fallbackId);
  return m ? `Команда ${m[1]}` : "—";
}

function parseSource(raw: unknown, fallback: BrainSlotSource): BrainSlotSource {
  const rec = asRecord(raw);
  if (!rec) return fallback;
  if (rec.kind === "bye") return { kind: "bye" };
  if (rec.kind === "team" && typeof rec.teamId === "string" && rec.teamId) {
    return { kind: "team", teamId: rec.teamId };
  }
  if (rec.kind === "place") {
    const group = typeof rec.group === "string" ? rec.group.trim() : "";
    const place = typeof rec.place === "number" ? rec.place : Number(rec.place);
    if (group && Number.isInteger(place) && place >= 1) return { kind: "place", group, place };
  }
  if (rec.kind === "overall") {
    const place = typeof rec.place === "number" ? rec.place : Number(rec.place);
    if (Number.isInteger(place) && place >= 1) return { kind: "overall", place };
  }
  if ((rec.kind === "winner" || rec.kind === "loser") && typeof rec.slotId === "string" && rec.slotId) {
    return { kind: rec.kind, slotId: rec.slotId };
  }
  return fallback;
}

function detectPreset(rec: Record<string, unknown>): BrainPresetId {
  if (isSopotPreset(rec.preset) || isSopotPreset(rec.template)) return "sopot";
  if (isBrainPreset(rec.preset)) return rec.preset;
  if (isBrainPreset(rec.template)) return rec.template;
  if (rec.template === BRAIN_TEMPLATE_OCHP_16) return "ochp-16";
  if (Array.isArray(rec.groups) || Array.isArray(rec.playoff)) return "ochp-16";
  return "ochp-16";
}

export function parseScheme(raw: unknown): BrainRingScheme | { error: string } {
  const rec = asRecord(raw);
  if (!rec) return { error: "Некорректная схема турнира" };

  const preset = detectPreset(rec);
  const questionCount = clampQuestionCount(rec.questionCount);
  const teamsIn = Array.isArray(rec.teams) ? rec.teams : [];

  let teamCount = clampInt(rec.teamCount ?? teamsIn.length, MIN_TEAM_COUNT, MAX_TEAM_COUNT);
  if (preset === "ochp-16") teamCount = BRAIN_TEAM_COUNT;
  if (preset === "sopot") teamCount = SOPOT_TEAM_COUNT;

  const seen = new Set<string>();
  const teams: BrainRingTeam[] = [];
  for (let i = 0; i < teamCount; i++) {
    const row = asRecord(teamsIn[i]);
    const id = typeof row?.id === "string" && row.id.trim() ? row.id.trim() : `t${i + 1}`;
    if (seen.has(id)) return { error: "Повторяющиеся id команд" };
    seen.add(id);
    teams.push({ id, name: typeof row?.name === "string" ? row.name.trim() : "" });
  }

  const thirdPlace = rec.thirdPlace !== false;
  const groupSize = clampInt(rec.groupSize, MIN_GROUP_SIZE, MAX_GROUP_SIZE);
  const groupCount = clampInt(rec.groupCount, MIN_GROUP_COUNT, MAX_GROUP_COUNT);
  let matchSize = clampMatchSize(rec.matchSize, preset === "nway" ? 3 : 2);
  if (preset === "olympic" || preset === "double-elim" || preset === "ochp-16" || preset === "sopot") matchSize = 2;

  const generated = emptyScheme(preset, {
    questionCount: preset === "sopot" ? SOPOT_STAGE1_Q : questionCount,
    matchSize,
    teamCount: teams.length,
    thirdPlace,
    groupCount,
    groupSize,
    names: teams.map((t) => t.name),
    prev: {
      preset,
      template: preset,
      questionCount,
      matchSize,
      teamCount: teams.length,
      thirdPlace,
      groupCount,
      groupSize,
      teams,
      stages: [],
      overallTieBreak: Array.isArray(rec.overallTieBreak)
        ? rec.overallTieBreak.filter((id): id is string => typeof id === "string")
        : undefined,
    },
  });

  const stagesIn = Array.isArray(rec.stages) ? rec.stages : [];
  if (preset === "ochp-16") {
    generated.stages = parseOchp16Stages(rec, generated.teams, questionCount);
    const assigned = allGroups(generated).flatMap((g) => g.teamIds);
    if (new Set(assigned).size !== BRAIN_TEAM_COUNT) {
      return { error: "Каждая команда должна быть ровно в одной группе" };
    }
    if (assigned.some((id) => !seen.has(id))) {
      return { error: "В группе указана неизвестная команда" };
    }
  } else if (preset === "sopot") {
    generated.stages = parseSopotStages(rec, generated);
    const stage1 = generated.stages.find((s) => s.id === "stage1" && s.type === "groups");
    const assigned = stage1 && stage1.type === "groups" ? stage1.groups.flatMap((g) => g.teamIds) : [];
    if (new Set(assigned).size !== SOPOT_TEAM_COUNT) {
      return { error: "Каждая команда должна быть ровно в одной группе А–Г" };
    }
    if (assigned.some((id) => !seen.has(id))) {
      return { error: "В группе указана неизвестная команда" };
    }
  } else if (preset === "groups") {
    const row = stagesIn.map(asRecord).find((s) => s?.type === "groups");
    const groupsIn = Array.isArray(row?.groups) ? row.groups : [];
    generated.stages = generated.stages.map((st) => {
      if (st.type !== "groups") return st;
      return {
        ...st,
        groups: st.groups.map((g, gi) => {
          const src = asRecord(groupsIn[gi]);
          return {
            ...g,
            letterName: typeof src?.letterName === "string" ? src.letterName.trim() : "",
            venue: typeof src?.venue === "string" ? src.venue.trim() : "",
            time: typeof src?.time === "string" ? src.time.trim() : "",
          };
        }),
      };
    });
  } else if (preset === "olympic" || preset === "double-elim") {
    const row = stagesIn.map(asRecord).find((s) => s?.type === "bracket" || s?.type === "playoff");
    const slotsIn = Array.isArray(row?.slots) ? row.slots : [];
    generated.stages = generated.stages.map((st) => {
      if (st.type !== "bracket") return st;
      return {
        ...st,
        slots: st.slots.map((slot, i) => {
          const src = asRecord(slotsIn[i]) ?? asRecord(slotsIn.find((x) => asRecord(x)?.id === slot.id));
          return { ...slot, venue: typeof src?.venue === "string" ? src.venue.trim() : "" };
        }),
      };
    });
  }

  return generated;
}

function parseOchp16Stages(
  rec: Record<string, unknown>,
  teams: BrainRingTeam[],
  questionCount: number,
): BrainRingStage[] {
  const stagesIn = Array.isArray(rec.stages) ? rec.stages : [];
  const groupStageRow = stagesIn.map(asRecord).find((s) => s?.type === "groups" || s?.id === "groups");
  const groupsRows = Array.isArray(groupStageRow?.groups) ? groupStageRow.groups : rec.groups;
  const groups = ochpGroups(teams).map((g, gi) => {
    const row = asRecord(Array.isArray(groupsRows) ? groupsRows[gi] : null);
    const fallback = g.teamIds;
    const raw = Array.isArray(row?.teamIds) ? row.teamIds : fallback;
    const teamIds = raw.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, 4);
    while (teamIds.length < 4) {
      const next = fallback.find((id) => !teamIds.includes(id));
      teamIds.push(next ?? `t${gi * 4 + teamIds.length + 1}`);
    }
    return {
      ...g,
      letterName: typeof row?.letterName === "string" ? row.letterName.trim() : "",
      venue: typeof row?.venue === "string" ? row.venue.trim() : "",
      time: typeof row?.time === "string" ? row.time.trim() : "",
      teamIds,
    };
  });

  const playoffRow = stagesIn.map(asRecord).find((s) => s?.type === "playoff" || s?.id === "finals");
  const slotsIn = Array.isArray(playoffRow?.slots)
    ? playoffRow.slots
    : Array.isArray(rec.playoff)
      ? rec.playoff
      : [];

  const slots = OCHP_16_PLAYOFF.map((tpl, i) => {
    const row = asRecord(slotsIn[i]) ?? asRecord(slotsIn.find((s) => asRecord(s)?.id === tpl.id));
    return asPlayoffSlot(
      tpl.id,
      tpl.round,
      [
        parseSource(row?.teamA, tpl.teamA),
        parseSource(row?.teamB, tpl.teamB),
      ],
      clampQuestionCount(row?.questionCount ?? questionCount),
      typeof row?.venue === "string" ? row.venue.trim() : "",
    );
  });

  return [
    { id: "groups", name: "Групповой этап", type: "groups", questionCount, groups },
    { id: "finals", name: "Финальный этап", type: "playoff", questionCount, slots },
  ];
}

function parseStringIds(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
}

export function parseHostIds(raw: unknown): string[] {
  const rec = asRecord(raw);
  return [...new Set(parseStringIds(rec?.hostIds))];
}

export function schemeWithHostIds(scheme: BrainRingScheme, hostIds: string[]): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify({ ...scheme, hostIds })) as Prisma.InputJsonValue;
}

/** Clear filled stage-2 / final / lottery; keep scheme, teams, and stage-1 slots. */
export function resetFilledSlots(scheme: BrainRingScheme): BrainRingScheme {
  return {
    ...scheme,
    overallTieBreak: undefined,
    stages: scheme.stages.map((st) => {
      if (st.type === "groups") {
        return {
          ...st,
          groups: st.groups.map((g) => ({
            ...g,
            teamIds: g.sources && g.sources.length > 0 ? [] : g.teamIds,
            tieBreak: undefined,
          })),
        };
      }
      if (st.type === "rr" && st.sources && st.sources.length > 0) {
        return { ...st, teamIds: [] };
      }
      return st;
    }),
  };
}

function parseSopotStages(rec: Record<string, unknown>, generated: BrainRingScheme): BrainRingStage[] {
  const stagesIn = Array.isArray(rec.stages) ? rec.stages : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of stagesIn.map(asRecord)) {
    if (row && typeof row.id === "string") byId.set(row.id, row);
  }

  return generated.stages.map((st) => {
    const src = byId.get(st.id);
    if (st.type === "groups" && st.id === "stage1") {
      const groupsIn = Array.isArray(src?.groups) ? src.groups : [];
      return {
        ...st,
        questionCount: clampQuestionCount(src?.questionCount ?? st.questionCount),
        groups: st.groups.map((g) => {
          const row = asRecord(groupsIn.find((x) => asRecord(x)?.letter === g.letter) ?? groupsIn.find((x) => asRecord(x)?.id === g.id));
          const fallback = g.teamIds;
          const teamIds = parseStringIds(row?.teamIds).slice(0, SOPOT_GROUP_SIZE);
          while (teamIds.length < SOPOT_GROUP_SIZE) {
            const next = fallback.find((id) => !teamIds.includes(id));
            teamIds.push(next ?? `t${teamIds.length + 1}`);
          }
          const tieBreak = parseStringIds(row?.tieBreak);
          return {
            ...g,
            letterName: typeof row?.letterName === "string" ? row.letterName.trim() : g.letterName,
            venue: typeof row?.venue === "string" ? row.venue.trim() : g.venue,
            time: typeof row?.time === "string" ? row.time.trim() : g.time,
            teamIds,
            tieBreak: tieBreak.length ? tieBreak : g.tieBreak,
          };
        }),
      };
    }
    if (st.type === "groups" && st.id === "stage2") {
      const groupsIn = Array.isArray(src?.groups) ? src.groups : [];
      return {
        ...st,
        questionCount: clampQuestionCount(src?.questionCount ?? st.questionCount),
        groups: st.groups.map((g) => {
          const row = asRecord(groupsIn.find((x) => asRecord(x)?.letter === g.letter) ?? groupsIn.find((x) => asRecord(x)?.id === g.id));
          const teamIds = parseStringIds(row?.teamIds).slice(0, 4);
          const tieBreak = parseStringIds(row?.tieBreak);
          return {
            ...g,
            letterName: typeof row?.letterName === "string" ? row.letterName.trim() : g.letterName,
            venue: typeof row?.venue === "string" ? row.venue.trim() : g.venue,
            time: typeof row?.time === "string" ? row.time.trim() : g.time,
            teamIds,
            sources: rematrixSources(g.letter),
            tieBreak: tieBreak.length ? tieBreak : g.tieBreak,
          };
        }),
      };
    }
    if (st.type === "rr" && st.id === "final") {
      return {
        ...st,
        questionCount: clampQuestionCount(src?.questionCount ?? st.questionCount),
        matchSize: 4,
        teamIds: parseStringIds(src?.teamIds).slice(0, 4),
        sources: [
          { kind: "overall", place: 1 },
          { kind: "overall", place: 2 },
          { kind: "overall", place: 3 },
          { kind: "overall", place: 4 },
        ],
      };
    }
    return st;
  });
}

function rowFromGen(m: BrainGenMatch, questionCount: number, venue = ""): BrainRingMatchRow {
  const q = clampQuestionCount(questionCount);
  const teamIds = m.teamIds.slice(0, MAX_MATCH_SIZE);
  return {
    slotId: m.slotId,
    sectionId: m.sectionId,
    kind: m.kind,
    round: m.round,
    venue,
    teamIds,
    teamAId: teamIds[0] ?? "",
    teamBId: teamIds[1] ?? "",
    playOrder: m.playOrder,
    questionCount: q,
    scores: { captures: emptyCaptures(q), teamIds },
    active: false,
  };
}

export function matchesFromScheme(scheme: BrainRingScheme): BrainRingMatchRow[] {
  const q = scheme.questionCount;
  const rows: BrainRingMatchRow[] = [];

  for (const stage of scheme.stages) {
    const stageQ = clampQuestionCount(stage.questionCount || q);
    if (stage.type === "groups") {
      const k = scheme.preset === "ochp-16" || scheme.preset === "sopot" ? 2 : scheme.matchSize;
      for (const g of stage.groups) {
        const playing = scheme.preset === "sopot" ? playingTeamIds(scheme.teams, g.teamIds) : g.teamIds.filter(Boolean);
        const pairs =
          playing.length >= 2
            ? roundRobinMatches(playing, k)
            : g.sources && g.sources.length >= 2
              ? Array.from({ length: pairCount(g.sources.length) }, () => [] as string[])
              : [];
        pairs.forEach((teamIds, i) => {
          rows.push(
            rowFromGen(
              {
                slotId: `${g.id}-${i + 1}`,
                sectionId: g.id,
                kind: "group",
                round: "",
                teamIds,
                sources: teamIds.length
                  ? teamIds.map((id) => ({ kind: "team" as const, teamId: id }))
                  : (g.sources ?? []).length
                    ? []
                    : [],
                playOrder: i + 1,
              },
              stageQ,
              g.venue,
            ),
          );
        });
      }
    } else if (stage.type === "rr") {
      if (scheme.preset === "sopot" && stage.id === "final") {
        const playing = playingTeamIds(scheme.teams, stage.teamIds);
        rows.push(
          rowFromGen(
            {
              slotId: "final",
              sectionId: stage.id,
              kind: "finals",
              round: "Final",
              teamIds: playing.length >= 2 ? playing : [],
              sources: stage.sources ?? [],
              playOrder: 1,
            },
            stageQ,
          ),
        );
      } else {
        const pairs = roundRobinMatches(stage.teamIds, stage.matchSize || scheme.matchSize);
        pairs.forEach((teamIds, i) => {
          rows.push(
            rowFromGen(
              {
                slotId: `rr-${i + 1}`,
                sectionId: stage.id,
                kind: "rr",
                round: "",
                teamIds,
                sources: teamIds.map((id) => ({ kind: "team" as const, teamId: id })),
                playOrder: i + 1,
              },
              stageQ,
            ),
          );
        });
      }
    } else {
      const kind = stage.type === "playoff" ? "finals" : "bracket";
      const gens = slotsToMatches(
        stage.slots.map((s) => ({ id: s.id, round: s.round, sources: [s.teamA, s.teamB] })),
        stage.id,
        kind,
      );
      gens.forEach((m, i) => {
        const slot = stage.slots[i];
        rows.push(rowFromGen(m, slot?.questionCount || stageQ, slot?.venue ?? ""));
      });
    }
  }

  return rows;
}

export function toMatchDto(
  row: {
    id: string;
    slotId: string;
    sectionId: string;
    kind: string;
    round: string;
    venue: string;
    teamAId: string;
    teamBId: string;
    playOrder: number;
    questionCount: number;
    scores: unknown;
    active: boolean;
  },
  teamNames: Record<string, string>,
): BrainRingMatchDto {
  const teamIds = parseTeamIdsFromScores(row.scores, row.teamAId, row.teamBId);
  const captures = parseCaptures(asRecord(row.scores)?.captures, row.questionCount);
  const scores = matchScores(captures, teamIds);
  const status = parseMatchStatus(row.scores, row.active, row.questionCount);
  const finished = status === "finished";
  const kind =
    row.kind === "finals" || row.kind === "bracket" || row.kind === "rr" || row.kind === "group"
      ? row.kind
      : "group";
  return {
    id: row.id,
    slotId: row.slotId,
    sectionId: row.sectionId,
    kind,
    round: row.round,
    venue: row.venue,
    teamIds,
    teamAId: teamIds[0] ?? row.teamAId,
    teamBId: teamIds[1] ?? row.teamBId,
    teamAName: teamLabel(teamNames[teamIds[0] ?? row.teamAId] ?? "", teamIds[0] ?? row.teamAId),
    teamBName: teamLabel(teamNames[teamIds[1] ?? row.teamBId] ?? "", teamIds[1] ?? row.teamBId),
    teamNames: teamIds.map((id) => teamLabel(teamNames[id] ?? "", id)),
    playOrder: row.playOrder,
    questionCount: row.questionCount,
    captures,
    scores,
    scoreA: scores[0] ?? 0,
    scoreB: scores[1] ?? 0,
    complete: finished,
    finished,
    status,
    active: row.active && status === "started",
    currentQuestion: currentQuestionIndex(captures),
  };
}

function tableMatches(matches: BrainRingMatchDto[]): BrainRingMatchDto[] {
  return matches.filter((m) => m.finished);
}

function standingsFor(
  teamIds: string[],
  names: Record<string, string>,
  matches: BrainRingMatchDto[],
): BrainRingPublicGroup["teams"] {
  const counted = tableMatches(matches);
  const twoTeam = counted.every((m) => m.teamIds.length <= 2);
  if (twoTeam) {
    const standings = computeStandings(
      teamIds,
      names,
      counted.map((m) => ({
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        complete: true,
      })),
    );
    return standings.map((s) => ({
      pos: String(s.place),
      name: s.teamName,
      played: s.played,
      win: s.wins,
      draw: s.draws,
      lost: s.losses,
      gf: s.scoredFor,
      ga: s.scoredAgainst,
      diff: s.diff,
      points: s.points,
    }));
  }

  const stats = new Map<
    string,
    { played: number; win: number; draw: number; lost: number; gf: number; ga: number; points: number }
  >();
  for (const id of teamIds) {
    stats.set(id, { played: 0, win: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 });
  }
  for (const m of counted) {
    if (!m.finished) continue;
    const involved = m.teamIds.filter((id) => stats.has(id));
    if (involved.length < 2) continue;
    const sc = involved.map((id) => m.scores[m.teamIds.indexOf(id)] ?? 0);
    const best = Math.max(...sc);
    const tied = sc.filter((x) => x === best).length > 1;
    involved.forEach((id, i) => {
      const row = stats.get(id)!;
      const mine = sc[i] ?? 0;
      row.played += 1;
      row.gf += mine;
      row.ga += sc.reduce((a, b) => a + b, 0) - mine;
      row.points += nwayPoints(sc, i);
      if (mine === best && !tied) row.win += 1;
      else if (mine === best) row.draw += 1;
      else row.lost += 1;
    });
  }
  return [...stats.entries()]
    .sort((a, b) => {
      if (b[1].points !== a[1].points) return b[1].points - a[1].points;
      const da = a[1].gf - a[1].ga;
      const db = b[1].gf - b[1].ga;
      if (db !== da) return db - da;
      if (b[1].gf !== a[1].gf) return b[1].gf - a[1].gf;
      return a[0].localeCompare(b[0]);
    })
    .map(([id, s], i) => ({
      pos: String(i + 1),
      name: teamLabel(names[id] ?? "", id),
      played: s.played,
      win: s.win,
      draw: s.draw,
      lost: s.lost,
      gf: s.gf,
      ga: s.ga,
      diff: s.gf - s.ga,
      points: s.points,
    }));
}

export function publicGroups(scheme: BrainRingScheme, matches: BrainRingMatchDto[]): BrainRingPublicGroup[] {
  if (scheme.preset === "sopot") return publicSopotGroups(scheme, matches);

  const names: Record<string, string> = {};
  for (const t of scheme.teams) names[t.id] = teamLabel(t.name, t.id);

  const fromStages = allGroups(scheme).map((g) => {
    const groupMatches = matches.filter((m) => m.kind === "group" && m.sectionId === g.id);
    return {
      letter: g.letter,
      letterName: g.letterName,
      venue: g.venue,
      time: g.time,
      teams: standingsFor(g.teamIds, names, groupMatches),
    };
  });
  if (fromStages.length) return fromStages;

  const rr = scheme.stages.find((s) => s.type === "rr");
  if (rr && rr.type === "rr") {
    const rrMatches = matches.filter((m) => m.kind === "rr" && m.sectionId === rr.id);
    return [
      {
        letter: "",
        letterName: rr.name,
        venue: "",
        time: "",
        teams: standingsFor(rr.teamIds, names, rrMatches),
      },
    ];
  }
  return [];
}

function rowsToPublic(rows: ReturnType<typeof sopotGroupStandings>): BrainRingPublicGroup["teams"] {
  return rows.map((s) => ({
    pos: String(s.place),
    name: teamLabel(s.teamName, s.teamId),
    played: s.played,
    win: s.wins,
    draw: s.draws,
    lost: s.losses,
    gf: s.scoredFor,
    ga: s.scoredAgainst,
    diff: s.diff,
    points: s.points,
  }));
}

function publicSopotGroups(scheme: BrainRingScheme, matches: BrainRingMatchDto[]): BrainRingPublicGroup[] {
  const out: BrainRingPublicGroup[] = [];
  const stage1 = scheme.stages.find((s) => s.id === "stage1" && s.type === "groups");
  const stage2 = scheme.stages.find((s) => s.id === "stage2" && s.type === "groups");

  if (stage1 && stage1.type === "groups") {
    for (const g of stage1.groups) {
      const playing = playingTeamIds(scheme.teams, g.teamIds);
      out.push({
        letter: g.letter,
        letterName: g.letterName,
        venue: g.venue,
        time: g.time,
        section: stage1.name,
        highlightTop: 4,
        outLast: playing.length >= 5,
        teams: rowsToPublic(sopotGroupStandings(g, scheme.teams, matches)),
      });
    }
  }

  if (stage2 && stage2.type === "groups") {
    for (const g of stage2.groups) {
      const playing = playingTeamIds(scheme.teams, g.teamIds);
      const filled = playing.length >= 2;
      out.push({
        letter: g.letter,
        letterName: g.letterName,
        venue: g.venue,
        time: g.time,
        section: stage2.name,
        highlightTop: 0,
        placeholder: !filled,
        teams: filled
          ? rowsToPublic(sopotGroupStandings(g, scheme.teams, matches))
          : (g.sources ?? rematrixSources(g.letter)).map((src, i) => ({
              pos: String(i + 1),
              name: placeCode(src) || "—",
              played: 0,
              win: 0,
              draw: 0,
              lost: 0,
              gf: 0,
              ga: 0,
              diff: 0,
              points: 0,
            })),
      });
    }
  }

  const advancing = sopotAdvancingIds(scheme.teams, sopotStage1Groups(scheme), matches);
  if (advancing.length > 0 && advancing.length <= 16) {
    out.push({
      letter: "",
      letterName: "Общая таблица",
      venue: "",
      time: "",
      section: "Общая таблица · 16 команд",
      highlightTop: 4,
      isCombined: true,
      teams: rowsToPublic(sopotCombinedStandings(scheme.teams, sopotStage1Groups(scheme), matches, scheme.overallTieBreak ?? [])),
    });
  }

  return out;
}

export function teamIdAtPlace(
  scheme: BrainRingScheme,
  matches: BrainRingMatchDto[],
  letter: string,
  place: number,
): string {
  const g = allGroups(scheme).find((x) => x.letter === letter);
  if (!g) return "";
  if (scheme.preset === "sopot") {
    return uniqueTeamAtPlace(sopotGroupStandings(g, scheme.teams, matches), place);
  }
  const names: Record<string, string> = {};
  for (const t of scheme.teams) names[t.id] = t.name || t.id;
  const groupMatches = matches
    .filter((m) => m.kind === "group" && m.sectionId === g.id && m.finished)
    .map((m) => ({
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      complete: true,
    }));
  const standings = computeStandings(g.teamIds, names, groupMatches);
  const row = standings[place - 1];
  if (!row || row.played === 0) return "";
  return row.teamId;
}

function matchWinnerLoser(m: BrainRingMatchDto): { winner: string; loser: string } {
  if (!m.complete || m.teamIds.length < 2) return { winner: "", loser: "" };
  const best = Math.max(...m.scores);
  const winners = m.teamIds.filter((_, i) => m.scores[i] === best);
  if (winners.length !== 1) return { winner: "", loser: "" };
  const winner = winners[0]!;
  const loser = m.teamIds.find((id) => id !== winner) ?? "";
  return { winner, loser };
}

export function resolvePlayoffSource(
  source: BrainSlotSource,
  scheme: BrainRingScheme,
  matches: BrainRingMatchDto[],
): string {
  if (source.kind === "team") return source.teamId;
  if (source.kind === "bye") return "";
  if (source.kind === "place") return teamIdAtPlace(scheme, matches, source.group, source.place);
  if (source.kind === "overall") {
    const rows = sopotCombinedStandings(
      scheme.teams,
      sopotStage1Groups(scheme),
      matches,
      scheme.overallTieBreak ?? [],
    );
    return uniqueTeamAtPlace(rows, source.place);
  }
  const m = matches.find((x) => x.slotId === source.slotId);
  if (!m) return "";
  const { winner, loser } = matchWinnerLoser(m);
  return source.kind === "winner" ? winner : loser;
}

export function scoresToJson(
  captures: BrainCapture[],
  teamIds?: string[],
  status?: BrainMatchStatus,
): Prisma.InputJsonValue {
  const payload: { captures: BrainCapture[]; teamIds?: string[]; status?: BrainMatchStatus } = { captures };
  if (teamIds?.length) payload.teamIds = teamIds;
  if (status && status !== "idle") payload.status = status;
  return payload as Prisma.InputJsonValue;
}

export function scoreLine(m: Pick<BrainRingMatchDto, "scores" | "scoreA" | "scoreB">): string {
  if (m.scores.length > 2) return m.scores.join(":");
  return `${m.scoreA}:${m.scoreB}`;
}
