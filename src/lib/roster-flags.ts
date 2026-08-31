import { fetchCurrentSeasonBasePlayerIds } from "@/lib/chgk";

/** Б = base roster, Л = legionnaire. Never К. */
export function rosterFlag(isBase: boolean): "Б" | "Л" {
  return isBase ? "Б" : "Л";
}

export function playerIsBase(
  chgkId: number | null | undefined,
  basePlayerIds: Set<number>,
): boolean {
  return typeof chgkId === "number" && basePlayerIds.has(chgkId);
}

function trustedClientIsBase(value: unknown): boolean {
  return value === true;
}

/** Current-season base IDs only (empty set = season not filled yet). */
export async function loadBasePlayerIdsByTeam(
  teamChgkIds: Array<number | null | undefined>,
): Promise<Map<number, Set<number>>> {
  const unique = [
    ...new Set(
      teamChgkIds.filter((id): id is number => typeof id === "number" && id > 0),
    ),
  ];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await fetchCurrentSeasonBasePlayerIds(id)] as const),
  );
  return new Map(entries);
}

/**
 * If the current rating season has a base roster, flags come from rating.
 * Otherwise (no team, or current season empty) the client's isBase is kept.
 */
export async function withBaseFlags<T extends { chgkId?: number | null; isBase?: boolean }>(
  teamChgkId: number | null | undefined,
  players: T[],
): Promise<(T & { isBase: boolean })[]> {
  if (!teamChgkId || teamChgkId <= 0) {
    return players.map((p) => ({ ...p, isBase: trustedClientIsBase(p.isBase) }));
  }
  const ids = await fetchCurrentSeasonBasePlayerIds(teamChgkId);
  if (ids.size === 0) {
    return players.map((p) => ({ ...p, isBase: trustedClientIsBase(p.isBase) }));
  }
  return players.map((p) => ({ ...p, isBase: playerIsBase(p.chgkId, ids) }));
}
