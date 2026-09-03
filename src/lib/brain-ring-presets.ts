import { scheduleRoundRobinNoBackToBack } from "@/lib/syreny-lite-brain-schedule";

export const BRAIN_PRESETS = [
  "olympic",
  "double-elim",
  "rr",
  "groups",
  "nway",
  "ochp-16",
  "sopot",
] as const;

export type BrainPresetId = (typeof BRAIN_PRESETS)[number];

export const PRESET_LABELS: Record<BrainPresetId, string> = {
  olympic: "Олимпийская схема",
  "double-elim": "Double Elimination",
  rr: "Общая группа",
  groups: "Групповой этап",
  nway: "Бой на несколько команд",
  "ochp-16": "ОЧП 1–16",
  sopot: "Сопотская",
};

export const SOPOT_PRESET = "sopot";
export const SOPOT_TEAM_COUNT = 20;
export const SOPOT_GROUP_COUNT = 4;
export const SOPOT_GROUP_SIZE = 5;
export const SOPOT_STAGE1_Q = 5;
export const SOPOT_STAGE2_Q = 5;
export const SOPOT_FINAL_Q = 15;
export const SOPOT_STAGE1_LETTERS = ["А", "Б", "В", "Г"] as const;
export const SOPOT_STAGE2_LETTERS = ["E", "F", "G", "H"] as const;

/** Frozen rematrix: letter = stage-1 group, digit = place. Stage 2 letters are Latin E–H. */
export const SOPOT_REMATRIX: ReadonlyArray<{
  letter: (typeof SOPOT_STAGE2_LETTERS)[number];
  slots: ReadonlyArray<{ group: (typeof SOPOT_STAGE1_LETTERS)[number]; place: number }>;
}> = [
  { letter: "E", slots: [{ group: "А", place: 1 }, { group: "Б", place: 2 }, { group: "В", place: 3 }, { group: "Г", place: 4 }] },
  { letter: "F", slots: [{ group: "А", place: 2 }, { group: "Б", place: 3 }, { group: "В", place: 4 }, { group: "Г", place: 1 }] },
  { letter: "G", slots: [{ group: "А", place: 3 }, { group: "Б", place: 4 }, { group: "В", place: 1 }, { group: "Г", place: 2 }] },
  { letter: "H", slots: [{ group: "А", place: 4 }, { group: "Б", place: 1 }, { group: "В", place: 2 }, { group: "Г", place: 3 }] },
];

export function isSopotPreset(v: unknown): boolean {
  return v === "sopot" || v === "sopotskaya";
}

export const MIN_TEAM_COUNT = 2;
export const MAX_TEAM_COUNT = 32;
export const MIN_GROUP_SIZE = 3;
export const MAX_GROUP_SIZE = 10;
export const MIN_GROUP_COUNT = 1;
export const MAX_GROUP_COUNT = 8;
export const MIN_MATCH_SIZE = 2;
export const MAX_MATCH_SIZE = 5;

export type BrainSlotSource =
  | { kind: "team"; teamId: string }
  | { kind: "bye" }
  | { kind: "winner"; slotId: string }
  | { kind: "loser"; slotId: string }
  | { kind: "place"; group: string; place: number }
  | { kind: "overall"; place: number };

export interface BrainGenSlot {
  id: string;
  round: string;
  sources: BrainSlotSource[];
}

export interface BrainGenMatch {
  slotId: string;
  sectionId: string;
  kind: "group" | "rr" | "bracket" | "finals";
  round: string;
  teamIds: string[];
  sources: BrainSlotSource[];
  playOrder: number;
}

export function isBrainPreset(v: unknown): v is BrainPresetId {
  return typeof v === "string" && (BRAIN_PRESETS as readonly string[]).includes(v);
}

export function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(2, p);
}

/** Standard 1-vs-N seeding order for a power-of-two bracket. */
export function standardSeedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(sum - s);
    }
    seeds = next;
  }
  return seeds;
}

export function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const acc: T[] = [];
  function rec(start: number) {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      acc.push(items[i]);
      rec(i + 1);
      acc.pop();
    }
  }
  if (k > 0 && k <= items.length) rec(0);
  return out;
}

/** Pairwise or N-way round-robin. k=2 uses no-back-to-back order when n≤5. */
export function roundRobinMatches(teamIds: string[], matchSize: number): string[][] {
  const k = clampInt(matchSize, MIN_MATCH_SIZE, MAX_MATCH_SIZE, 2);
  const ids = teamIds.filter(Boolean);
  if (ids.length < 2) return [];
  const size = Math.min(k, ids.length);
  if (size === 2) {
    if (ids.length <= 5) return scheduleRoundRobinNoBackToBack(ids).map((p) => [p[0], p[1]]);
    return combinations(ids, 2);
  }
  return combinations(ids, size);
}

export function olympicRoundLabel(teamsInRound: number): string {
  if (teamsInRound <= 2) return "Final";
  if (teamsInRound === 4) return "1/2";
  if (teamsInRound === 8) return "1/4";
  if (teamsInRound === 16) return "1/8";
  if (teamsInRound === 32) return "1/16";
  return `1/${teamsInRound / 2}`;
}

/**
 * Single-elimination slots. Byes when team count is not 2^n.
 * Third-place match is added when there are two distinct semi-finals.
 */
export function generateOlympic(teamIds: string[], thirdPlace: boolean): BrainGenSlot[] {
  const ids = teamIds.filter(Boolean);
  if (ids.length < 2) return [];
  const size = nextPowerOfTwo(ids.length);
  const order = standardSeedOrder(size);
  const placed: Array<string | null> = order.map((seed) => (seed <= ids.length ? ids[seed - 1]! : null));

  const slots: BrainGenSlot[] = [];
  let prev: BrainSlotSource[] = placed.map((id) => (id ? { kind: "team", teamId: id } : { kind: "bye" }));
  let roundN = 1;
  const sfIds: string[] = [];

  while (prev.length > 1) {
    const next: BrainSlotSource[] = [];
    const label = olympicRoundLabel(prev.length);
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i]!;
      const b = prev[i + 1] ?? { kind: "bye" as const };
      if (a.kind === "bye" && b.kind === "bye") {
        next.push({ kind: "bye" });
        continue;
      }
      if (a.kind === "bye") {
        next.push(b);
        continue;
      }
      if (b.kind === "bye") {
        next.push(a);
        continue;
      }
      const id = `ol-${roundN}-${i / 2 + 1}`;
      slots.push({ id, round: label, sources: [a, b] });
      next.push({ kind: "winner", slotId: id });
      if (prev.length === 4) sfIds.push(id);
    }
    prev = next;
    roundN++;
  }

  if (thirdPlace && sfIds.length === 2) {
    slots.push({
      id: "ol-third",
      round: "3rd",
      sources: [
        { kind: "loser", slotId: sfIds[0]! },
        { kind: "loser", slotId: sfIds[1]! },
      ],
    });
  }
  return slots;
}

function pairSources(pending: BrainSlotSource[], prefix: string, round: string, slots: BrainGenSlot[]): BrainSlotSource[] {
  const next: BrainSlotSource[] = [];
  let n = 0;
  for (let i = 0; i < pending.length; i += 2) {
    const a = pending[i]!;
    const b = pending[i + 1];
    if (!b) {
      next.push(a);
      continue;
    }
    if (a.kind === "bye" && b.kind === "bye") {
      next.push({ kind: "bye" });
      continue;
    }
    if (a.kind === "bye") {
      next.push(b);
      continue;
    }
    if (b.kind === "bye") {
      next.push(a);
      continue;
    }
    n += 1;
    const id = `${prefix}-${n}`;
    slots.push({ id, round, sources: [a, b] });
    next.push({ kind: "winner", slotId: id });
  }
  return next;
}

/**
 * Double elimination: winners + losers + one-match grand final (no reset).
 * Non-power-of-two fields get byes in the winners bracket.
 */
export function generateDoubleElim(teamIds: string[]): BrainGenSlot[] {
  const ids = teamIds.filter(Boolean);
  if (ids.length < 2) return [];
  const size = nextPowerOfTwo(ids.length);
  const order = standardSeedOrder(size);
  const placed: Array<string | null> = order.map((seed) => (seed <= ids.length ? ids[seed - 1]! : null));

  const slots: BrainGenSlot[] = [];
  const wbRounds: BrainGenSlot[][] = [];
  let prev: BrainSlotSource[] = placed.map((id) => (id ? { kind: "team", teamId: id } : { kind: "bye" }));
  let wr = 1;

  while (prev.length > 1) {
    const roundSlots: BrainGenSlot[] = [];
    const next: BrainSlotSource[] = [];
    const label = prev.length === 2 ? "WB Final" : `WB ${olympicRoundLabel(prev.length)}`;
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i]!;
      const b = prev[i + 1] ?? { kind: "bye" as const };
      if (a.kind === "bye" && b.kind === "bye") {
        next.push({ kind: "bye" });
        continue;
      }
      if (a.kind === "bye") {
        next.push(b);
        continue;
      }
      if (b.kind === "bye") {
        next.push(a);
        continue;
      }
      const id = `wb-${wr}-${i / 2 + 1}`;
      const slot: BrainGenSlot = { id, round: label, sources: [a, b] };
      slots.push(slot);
      roundSlots.push(slot);
      next.push({ kind: "winner", slotId: id });
    }
    if (roundSlots.length) wbRounds.push(roundSlots);
    prev = next;
    wr += 1;
  }

  const wbChamp = prev[0];
  if (!wbChamp || wbChamp.kind === "bye") return slots;

  let lbAlive: BrainSlotSource[] = [];
  if (wbRounds[0]) {
    lbAlive = pairSources(
      wbRounds[0].map((s) => ({ kind: "loser" as const, slotId: s.id })),
      "lb-1",
      "LB 1",
      slots,
    );
  }

  let lbRound = 2;
  for (let r = 1; r < wbRounds.length; r++) {
    const drops = wbRounds[r]!.map((s) => ({ kind: "loser" as const, slotId: s.id }));
    const pending = [...lbAlive, ...drops];
    lbAlive = pairSources(pending, `lb-${lbRound}`, `LB ${lbRound}`, slots);
    lbRound += 1;
    const nextDropCount = r + 1 < wbRounds.length ? wbRounds[r + 1]!.length : 1;
    while (lbAlive.length > nextDropCount) {
      lbAlive = pairSources(lbAlive, `lb-${lbRound}`, `LB ${lbRound}`, slots);
      lbRound += 1;
    }
  }

  const lbChamp = lbAlive[0];
  if (lbChamp && lbChamp.kind !== "bye") {
    slots.push({
      id: "gf",
      round: "GF",
      sources: [wbChamp, lbChamp],
    });
  }
  return slots;
}

export function slotsToMatches(slots: BrainGenSlot[], sectionId: string, kind: BrainGenMatch["kind"]): BrainGenMatch[] {
  return slots.map((s, i) => {
    const teamIds = s.sources
      .filter((x): x is { kind: "team"; teamId: string } => x.kind === "team")
      .map((x) => x.teamId);
    return {
      slotId: s.id,
      sectionId,
      kind,
      round: s.round,
      teamIds: teamIds.length === s.sources.length ? teamIds : [],
      sources: s.sources,
      playOrder: i + 1,
    };
  });
}

export function groupLetters(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

/** N-way match points: same as 2-team brain-ring when N=2 (3 / 2 / 1 / 0). */
export function nwayPoints(scores: number[], index: number): number {
  const mine = scores[index] ?? 0;
  const best = scores.length ? Math.max(...scores) : 0;
  const tiedBest = scores.filter((s) => s === best).length > 1;
  if (mine === best) {
    if (!tiedBest) return 3;
    return mine === 0 ? 0 : 2;
  }
  return mine === 0 ? 0 : 1;
}
