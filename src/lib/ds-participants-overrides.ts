import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { DsParticipant } from "@/lib/ds-participants";

const CACHE_KEY = "ds-participants-overrides";

export interface DsOverrides {
  removed: string[];
  confirmed: string[];
}

export type DsDisplayParticipant = DsParticipant & {
  participantKey: string;
  adminRemoved: boolean;
  adminConfirmed: boolean;
  /** EventTeam.id on the main DS calendar event, if mapped. */
  eventTeamId: string | null;
  /** One-time name from EventTeam.displayName. */
  displayName: string | null;
  /** Rating/official name shown muted when a one-time name is set. */
  officialName: string;
  /** TeamRoster submitted for the main DS calendar event. */
  hasRoster: boolean;
};

/** ASCII unit separator. NUL cannot be stored in Postgres JSONB. */
const NAME_KEY_SEP = "\u001f";

export function participantKey(
  p: Pick<DsParticipant, "teamId" | "team" | "registeredAt">,
): string {
  if (p.teamId > 0) return `id:${p.teamId}`;
  return `n:${p.team}${NAME_KEY_SEP}${p.registeredAt}`;
}

/** Accept legacy NUL-separated keys from in-flight UIs. */
export function normalizeParticipantKey(key: string): string {
  return key.replace(/\0/g, NAME_KEY_SEP);
}

export async function loadDsOverrides(): Promise<DsOverrides> {
  const row = await db.dataCache.findUnique({ where: { key: CACHE_KEY } });
  if (!row?.value || typeof row.value !== "object") {
    return { removed: [], confirmed: [] };
  }
  const v = row.value as Partial<DsOverrides>;
  const keys = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? arr.filter((k): k is string => typeof k === "string").map(normalizeParticipantKey)
      : [];
  return {
    removed: keys(v.removed),
    confirmed: keys(v.confirmed),
  };
}

export async function saveDsOverrides(overrides: DsOverrides): Promise<void> {
  const value = JSON.parse(JSON.stringify(overrides)) as Prisma.InputJsonValue;
  await db.dataCache.upsert({
    where: { key: CACHE_KEY },
    update: { value },
    create: { key: CACHE_KEY, value },
  });
}

/** Apply admin overrides on top of sheet-based slot allocation. */
export function applyDsOverrides(
  base: DsParticipant[],
  overrides: DsOverrides,
): DsDisplayParticipant[] {
  const removedSet = new Set(overrides.removed);
  const confirmedSet = new Set(overrides.confirmed);
  const baseByKey = new Map(base.map((p) => [participantKey(p), p]));

  return base.map((p) => {
    const key = participantKey(p);
    const orig = baseByKey.get(key) ?? p;

    if (removedSet.has(key)) {
      return {
        ...p,
        participantKey: key,
        inWaitlist: true,
        category: "none",
        categoryLabel: "",
        adminRemoved: true,
        adminConfirmed: false,
        eventTeamId: null,
        displayName: null,
        officialName: p.team,
        hasRoster: false,
      };
    }

    if (confirmedSet.has(key)) {
      const slot = !orig.inWaitlist ? orig : null;
      return {
        ...p,
        participantKey: key,
        inWaitlist: false,
        category: slot?.category ?? p.category,
        categoryLabel: slot?.categoryLabel ?? p.categoryLabel,
        adminRemoved: false,
        adminConfirmed: true,
        eventTeamId: null,
        displayName: null,
        officialName: p.team,
        hasRoster: false,
      };
    }

    return {
      ...p,
      participantKey: key,
      adminRemoved: false,
      adminConfirmed: false,
      eventTeamId: null,
      displayName: null,
      officialName: p.team,
      hasRoster: false,
    };
  });
}

export async function setDsOverride(
  key: string,
  action: "remove" | "confirm",
): Promise<DsOverrides> {
  const overrides = await loadDsOverrides();
  const canonical = normalizeParticipantKey(key);
  const removed = new Set(overrides.removed);
  const confirmed = new Set(overrides.confirmed);

  if (action === "remove") {
    confirmed.delete(canonical);
    removed.add(canonical);
  } else {
    removed.delete(canonical);
    confirmed.add(canonical);
  }

  const next: DsOverrides = {
    removed: [...removed],
    confirmed: [...confirmed],
  };
  await saveDsOverrides(next);
  return next;
}
