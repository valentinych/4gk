import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type {
  BrainDrawReveal,
  BrainGroupAssignments,
  BrainMatch,
  BrainSection,
  BrainSectionId,
  BrainTeam,
  TournamentState,
} from "./syreny-lite-brain-store-types";

export const BRAIN_RING_CACHE_KEY = "syreny-lite-brain-ring";

type CapturePersist = string | null | false;

interface PersistedBrainState {
  v: 1;
  matchCounter: number;
  initialized: boolean;
  setup: boolean;
  groupAssignments: BrainGroupAssignments;
  drawReveal: BrainDrawReveal | null;
  updatedAt: number;
  activeMatchIds: Partial<Record<BrainSectionId, string | null>>;
  teams: BrainTeam[];
  sections: BrainSection[];
  matches: Array<
    Omit<BrainMatch, "captures"> & { captures: CapturePersist[] }
  >;
}

function serializeCaptures(
  captures: (string | null | undefined)[],
): CapturePersist[] {
  return captures.map((c) => (c === undefined ? false : c));
}

function deserializeCaptures(
  captures: CapturePersist[],
): (string | null | undefined)[] {
  return captures.map((c) => (c === false ? undefined : c));
}

export function serializeBrainState(state: TournamentState): PersistedBrainState {
  return {
    v: 1,
    matchCounter: state.matchCounter,
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
    teams: [...state.teams.values()],
    sections: state.sections.map((s) => ({
      id: s.id,
      name: s.name,
      teamIds: [...s.teamIds],
    })),
    matches: [...state.matches.values()].map((m) => ({
      id: m.id,
      sectionId: m.sectionId,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      questionCount: m.questionCount,
      playOrder: m.playOrder,
      captures: serializeCaptures(m.captures),
    })),
  };
}

export function deserializeBrainState(
  raw: PersistedBrainState,
): TournamentState {
  const teams = new Map<string, BrainTeam>();
  for (const t of raw.teams) teams.set(t.id, { ...t });

  const matches = new Map<string, BrainMatch>();
  for (const m of raw.matches) {
    matches.set(m.id, {
      id: m.id,
      sectionId: m.sectionId,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      questionCount: m.questionCount,
      playOrder: m.playOrder,
      captures: deserializeCaptures(m.captures),
    });
  }

  return {
    matchCounter: raw.matchCounter,
    initialized: raw.initialized,
    setup: raw.setup,
    groupAssignments: {
      groupA: [...raw.groupAssignments.groupA],
      groupB: [...raw.groupAssignments.groupB],
      outGroup: [...raw.groupAssignments.outGroup],
    },
    drawReveal: raw.drawReveal,
    updatedAt: raw.updatedAt,
    activeMatchIds: { ...raw.activeMatchIds },
    teams,
    sections: raw.sections.map((s) => ({
      id: s.id,
      name: s.name,
      teamIds: [...s.teamIds],
    })),
    matches,
  };
}

export async function loadBrainStateFromDb(): Promise<TournamentState | null> {
  const row = await db.dataCache.findUnique({ where: { key: BRAIN_RING_CACHE_KEY } });
  if (!row?.value) return null;
  const raw = row.value as unknown as PersistedBrainState;
  if (raw.v !== 1) return null;
  return deserializeBrainState(raw);
}

export async function saveBrainStateToDb(state: TournamentState): Promise<void> {
  const value = serializeBrainState(state) as unknown as Prisma.InputJsonValue;
  await db.dataCache.upsert({
    where: { key: BRAIN_RING_CACHE_KEY },
    create: { key: BRAIN_RING_CACHE_KEY, value },
    update: { value },
  });
}

export async function deleteBrainStateFromDb(): Promise<void> {
  await db.dataCache.deleteMany({ where: { key: BRAIN_RING_CACHE_KEY } });
}
