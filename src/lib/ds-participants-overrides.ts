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
};

export function participantKey(
  p: Pick<DsParticipant, "teamId" | "team" | "registeredAt">,
): string {
  if (p.teamId > 0) return `id:${p.teamId}`;
  return `n:${p.team}\0${p.registeredAt}`;
}

export async function loadDsOverrides(): Promise<DsOverrides> {
  const row = await db.dataCache.findUnique({ where: { key: CACHE_KEY } });
  if (!row?.value || typeof row.value !== "object") {
    return { removed: [], confirmed: [] };
  }
  const v = row.value as Partial<DsOverrides>;
  return {
    removed: Array.isArray(v.removed) ? v.removed.filter((k) => typeof k === "string") : [],
    confirmed: Array.isArray(v.confirmed) ? v.confirmed.filter((k) => typeof k === "string") : [],
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
      };
    }

    return {
      ...p,
      participantKey: key,
      adminRemoved: false,
      adminConfirmed: false,
    };
  });
}

export async function setDsOverride(
  key: string,
  action: "remove" | "confirm",
): Promise<DsOverrides> {
  const overrides = await loadDsOverrides();
  const removed = new Set(overrides.removed);
  const confirmed = new Set(overrides.confirmed);

  if (action === "remove") {
    confirmed.delete(key);
    removed.add(key);
  } else {
    removed.delete(key);
    confirmed.add(key);
  }

  const next: DsOverrides = {
    removed: [...removed],
    confirmed: [...confirmed],
  };
  await saveDsOverrides(next);
  return next;
}
