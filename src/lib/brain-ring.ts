import type { Prisma } from "@prisma/client";
import { computeStandings } from "@/lib/syreny-lite-brain-standings";
import { scheduleRoundRobinNoBackToBack } from "@/lib/syreny-lite-brain-schedule";

export const BRAIN_TEMPLATE_OCHP_16 = "ochp-16";
export const BRAIN_GROUP_COUNT = 4;
export const BRAIN_TEAMS_PER_GROUP = 4;
export const BRAIN_TEAM_COUNT = BRAIN_GROUP_COUNT * BRAIN_TEAMS_PER_GROUP;
export const DEFAULT_QUESTION_COUNT = 7;
export const GROUP_LETTERS = ["A", "B", "C", "D"] as const;

export const PLAYOFF_SLOTS = [
  { id: "sf1", round: "1/2" },
  { id: "sf2", round: "1/2" },
  { id: "third", round: "3rd" },
  { id: "final", round: "Final" },
] as const;

export const ROUND_LABELS: Record<string, string> = {
  "1/2": "Полуфинал",
  "3rd": "За 3-е место",
  Final: "Финал",
};

/** `false` = unanswered; team id = that team took the question. */
export type BrainCapture = string | false;

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
}

export interface BrainRingPlayoffSlot {
  id: string;
  round: string;
  venue: string;
}

export interface BrainRingScheme {
  template: typeof BRAIN_TEMPLATE_OCHP_16;
  questionCount: number;
  teams: BrainRingTeam[];
  groups: BrainRingGroupScheme[];
  playoff: BrainRingPlayoffSlot[];
}

export interface BrainRingMatchRow {
  slotId: string;
  sectionId: string;
  kind: "group" | "finals";
  round: string;
  venue: string;
  teamAId: string;
  teamBId: string;
  playOrder: number;
  questionCount: number;
  scores: { captures: BrainCapture[] };
  active: boolean;
}

export interface BrainRingMatchDto {
  id: string;
  slotId: string;
  sectionId: string;
  kind: "group" | "finals";
  round: string;
  venue: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  playOrder: number;
  questionCount: number;
  captures: BrainCapture[];
  scoreA: number;
  scoreB: number;
  complete: boolean;
  active: boolean;
  currentQuestion: number;
}

export interface BrainRingPublicGroup {
  letter: string;
  letterName: string;
  venue: string;
  time: string;
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

export function emptyCaptures(n: number): BrainCapture[] {
  return Array.from({ length: Math.max(1, n) }, () => false);
}

export function clampQuestionCount(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_QUESTION_COUNT;
  return Math.min(15, Math.max(1, Math.round(n)));
}

export function emptyOchp16Scheme(names?: string[]): BrainRingScheme {
  const teams: BrainRingTeam[] = Array.from({ length: BRAIN_TEAM_COUNT }, (_, i) => ({
    id: `t${i + 1}`,
    name: names?.[i]?.trim() ?? "",
  }));
  const groups: BrainRingGroupScheme[] = GROUP_LETTERS.map((letter, gi) => ({
    id: letter,
    letter,
    letterName: "",
    venue: "",
    time: "",
    teamIds: teams.slice(gi * BRAIN_TEAMS_PER_GROUP, gi * BRAIN_TEAMS_PER_GROUP + BRAIN_TEAMS_PER_GROUP).map(
      (t) => t.id,
    ),
  }));
  return {
    template: BRAIN_TEMPLATE_OCHP_16,
    questionCount: DEFAULT_QUESTION_COUNT,
    teams,
    groups,
    playoff: PLAYOFF_SLOTS.map((p) => ({ id: p.id, round: p.round, venue: "" })),
  };
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

export function parseScoresJson(raw: unknown, questionCount: number): { captures: BrainCapture[] } {
  const rec = asRecord(raw);
  return { captures: parseCaptures(rec?.captures, questionCount) };
}

export function matchScores(
  captures: BrainCapture[],
  teamAId: string,
  teamBId: string,
): { scoreA: number; scoreB: number } {
  let scoreA = 0;
  let scoreB = 0;
  for (const c of captures) {
    if (c === false || !c) continue;
    if (c === teamAId) scoreA++;
    else if (c === teamBId) scoreB++;
  }
  return { scoreA, scoreB };
}

export function matchComplete(captures: BrainCapture[]): boolean {
  return captures.length > 0 && captures.every((c) => typeof c === "string" && c.length > 0);
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

export function parseScheme(raw: unknown): BrainRingScheme | { error: string } {
  const rec = asRecord(raw);
  if (!rec) return { error: "Некорректная схема турнира" };

  const questionCount = clampQuestionCount(rec.questionCount);
  const teamsIn = Array.isArray(rec.teams) ? rec.teams : [];
  const teams: BrainRingTeam[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < BRAIN_TEAM_COUNT; i++) {
    const row = asRecord(teamsIn[i]);
    const id = typeof row?.id === "string" && row.id.trim() ? row.id.trim() : `t${i + 1}`;
    if (seen.has(id)) return { error: "Повторяющиеся id команд" };
    seen.add(id);
    teams.push({
      id,
      name: typeof row?.name === "string" ? row.name.trim() : "",
    });
  }

  const groupsIn = Array.isArray(rec.groups) ? rec.groups : [];
  const groups: BrainRingGroupScheme[] = GROUP_LETTERS.map((letter, gi) => {
    const row = asRecord(groupsIn[gi]);
    const fallbackIds = teams
      .slice(gi * BRAIN_TEAMS_PER_GROUP, gi * BRAIN_TEAMS_PER_GROUP + BRAIN_TEAMS_PER_GROUP)
      .map((t) => t.id);
    const teamIdsRaw = Array.isArray(row?.teamIds) ? row.teamIds : fallbackIds;
    const teamIds = teamIdsRaw
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .slice(0, BRAIN_TEAMS_PER_GROUP);
    while (teamIds.length < BRAIN_TEAMS_PER_GROUP) {
      const next = fallbackIds.find((id) => !teamIds.includes(id));
      teamIds.push(next ?? `t${gi * BRAIN_TEAMS_PER_GROUP + teamIds.length + 1}`);
    }
    return {
      id: letter,
      letter,
      letterName: typeof row?.letterName === "string" ? row.letterName.trim() : "",
      venue: typeof row?.venue === "string" ? row.venue.trim() : "",
      time: typeof row?.time === "string" ? row.time.trim() : "",
      teamIds,
    };
  });

  const assigned = groups.flatMap((g) => g.teamIds);
  if (new Set(assigned).size !== BRAIN_TEAM_COUNT) {
    return { error: "Каждая команда должна быть ровно в одной группе" };
  }
  if (assigned.some((id) => !seen.has(id))) {
    return { error: "В группе указана неизвестная команда" };
  }

  const playoffIn = Array.isArray(rec.playoff) ? rec.playoff : [];
  const playoff: BrainRingPlayoffSlot[] = PLAYOFF_SLOTS.map((slot, i) => {
    const row = asRecord(playoffIn[i]);
    return {
      id: slot.id,
      round: slot.round,
      venue: typeof row?.venue === "string" ? row.venue.trim() : "",
    };
  });

  return {
    template: BRAIN_TEMPLATE_OCHP_16,
    questionCount,
    teams,
    groups,
    playoff,
  };
}

export function matchesFromScheme(scheme: BrainRingScheme): BrainRingMatchRow[] {
  const q = scheme.questionCount;
  const rows: BrainRingMatchRow[] = [];
  const teamById = new Map(scheme.teams.map((t) => [t.id, t]));

  for (const g of scheme.groups) {
    const ids = g.teamIds.filter((id) => teamById.has(id));
    const pairs = scheduleRoundRobinNoBackToBack(ids);
    pairs.forEach((pair, i) => {
      const playOrder = i + 1;
      rows.push({
        slotId: `${g.id}-${playOrder}`,
        sectionId: g.id,
        kind: "group",
        round: "",
        venue: g.venue,
        teamAId: pair[0],
        teamBId: pair[1],
        playOrder,
        questionCount: q,
        scores: { captures: emptyCaptures(q) },
        active: false,
      });
    });
  }

  for (const [i, p] of scheme.playoff.entries()) {
    rows.push({
      slotId: p.id,
      sectionId: "finals",
      kind: "finals",
      round: p.round,
      venue: p.venue,
      teamAId: "",
      teamBId: "",
      playOrder: i + 1,
      questionCount: q,
      scores: { captures: emptyCaptures(q) },
      active: false,
    });
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
  const captures = parseCaptures(
    asRecord(row.scores)?.captures,
    row.questionCount,
  );
  const { scoreA, scoreB } = matchScores(captures, row.teamAId, row.teamBId);
  return {
    id: row.id,
    slotId: row.slotId,
    sectionId: row.sectionId,
    kind: row.kind === "finals" ? "finals" : "group",
    round: row.round,
    venue: row.venue,
    teamAId: row.teamAId,
    teamBId: row.teamBId,
    teamAName: teamLabel(teamNames[row.teamAId] ?? "", row.teamAId),
    teamBName: teamLabel(teamNames[row.teamBId] ?? "", row.teamBId),
    playOrder: row.playOrder,
    questionCount: row.questionCount,
    captures,
    scoreA,
    scoreB,
    complete: matchComplete(captures),
    active: row.active,
    currentQuestion: currentQuestionIndex(captures),
  };
}

export function publicGroups(
  scheme: BrainRingScheme,
  matches: BrainRingMatchDto[],
): BrainRingPublicGroup[] {
  const names: Record<string, string> = {};
  for (const t of scheme.teams) names[t.id] = teamLabel(t.name, t.id);

  return scheme.groups.map((g) => {
    const groupMatches = matches
      .filter((m) => m.kind === "group" && m.sectionId === g.id)
      .map((m) => ({
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        complete: m.complete,
      }));
    const standings = computeStandings(g.teamIds, names, groupMatches);
    return {
      letter: g.letter,
      letterName: g.letterName,
      venue: g.venue,
      time: g.time,
      teams: standings.map((s) => ({
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
      })),
    };
  });
}

export function teamIdAtPlace(
  scheme: BrainRingScheme,
  matches: BrainRingMatchDto[],
  letter: string,
  place: number,
): string {
  const g = scheme.groups.find((x) => x.letter === letter);
  if (!g) return "";
  const names: Record<string, string> = {};
  for (const t of scheme.teams) names[t.id] = t.name || t.id;
  const groupMatches = matches
    .filter((m) => m.kind === "group" && m.sectionId === g.id)
    .map((m) => ({
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      complete: m.complete,
    }));
  const standings = computeStandings(g.teamIds, names, groupMatches);
  const row = standings[place - 1];
  if (!row || row.played === 0) return "";
  return row.teamId;
}

export function scoresToJson(captures: BrainCapture[]): Prisma.InputJsonValue {
  return { captures } as Prisma.InputJsonValue;
}
