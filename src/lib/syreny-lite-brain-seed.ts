import { db } from "./db";
import { fetchChgkGgRatings } from "./chgk-gg";
import {
  SYRENY_LITE_BRAIN_SEED_GROUPS,
  SYRENY_LITE_EVENT_ID,
  SYRENY_LITE_HIDDEN_TEAM_NAMES,
  applySyrenyLiteDisplayName,
  isOutOfCompetition,
  normalizeSyrenyLiteName,
} from "./syreny-lite";
import type { InitTeamInput } from "./syreny-lite-brain-store-types";

function norm(s: string): string {
  return normalizeSyrenyLiteName(s);
}

export async function loadSyrenyLiteBrainTeams(): Promise<InitTeamInput[]> {
  const rawTeams = await db.eventTeam.findMany({
    where: { eventId: SYRENY_LITE_EVENT_ID, withdrawnAt: null },
    orderBy: { addedAt: "asc" },
    select: {
      id: true,
      teamChgkId: true,
      teamName: true,
      displayName: true,
      manualEntry: true,
    },
  });

  const teams = rawTeams.filter(
    (t) =>
      !SYRENY_LITE_HIDDEN_TEAM_NAMES.has(
        norm(t.displayName ?? t.teamName),
      ),
  );

  const realIds = teams
    .filter((t) => !t.manualEntry && t.teamChgkId > 0)
    .map((t) => t.teamChgkId);
  const { map: ratings } = await fetchChgkGgRatings(realIds);

  return teams.map((t) => {
    const name = applySyrenyLiteDisplayName(t.displayName ?? t.teamName);
    const r =
      !t.manualEntry && t.teamChgkId > 0 ? ratings.get(t.teamChgkId) : null;
    return {
      id: t.id,
      name,
      outOfCompetition: isOutOfCompetition(r?.position ?? null),
    };
  });
}

function resolveTeamIdByName(
  teams: InitTeamInput[],
  displayName: string,
): string | null {
  const target = norm(displayName);
  const hit = teams.find((t) => norm(t.name) === target);
  return hit?.id ?? null;
}

export function resolveSyrenyLiteBrainSeedAssignments(
  teams: InitTeamInput[],
): { groupA: string[]; groupB: string[]; outGroup: string[] } | string {
  const groupA: string[] = [];
  for (const name of SYRENY_LITE_BRAIN_SEED_GROUPS.groupA) {
    const id = resolveTeamIdByName(teams, name);
    if (!id) return `Команда не найдена: ${name}`;
    groupA.push(id);
  }

  const groupB: string[] = [];
  for (const name of SYRENY_LITE_BRAIN_SEED_GROUPS.groupB) {
    const id = resolveTeamIdByName(teams, name);
    if (!id) return `Команда не найдена: ${name}`;
    groupB.push(id);
  }

  const used = new Set([...groupA, ...groupB]);
  const seededOut = SYRENY_LITE_BRAIN_SEED_GROUPS.outGroup
    .map((name) => resolveTeamIdByName(teams, name))
    .filter((id): id is string => id != null);

  const outGroup: string[] = [];
  for (const id of seededOut) {
    if (!used.has(id)) outGroup.push(id);
  }

  if (outGroup.length === 0) {
    for (const t of teams) {
      if (!t.outOfCompetition || used.has(t.id)) continue;
      outGroup.push(t.id);
      if (outGroup.length >= 4) break;
    }
  }

  return { groupA, groupB, outGroup };
}
