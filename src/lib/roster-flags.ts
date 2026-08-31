import { fetchTeamBasePlayerIds } from "@/lib/chgk";

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

export async function loadBasePlayerIdsByTeam(
  teamChgkIds: Array<number | null | undefined>,
): Promise<Map<number, Set<number>>> {
  const unique = [
    ...new Set(
      teamChgkIds.filter((id): id is number => typeof id === "number" && id > 0),
    ),
  ];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await fetchTeamBasePlayerIds(id)] as const),
  );
  return new Map(entries);
}

/** Players without a rating ID, or not on the team's rating base, are legionnaires. */
export async function withBaseFlags<T extends { chgkId?: number | null }>(
  teamChgkId: number | null | undefined,
  players: T[],
): Promise<(T & { isBase: boolean })[]> {
  if (!teamChgkId || teamChgkId <= 0) {
    return players.map((p) => ({ ...p, isBase: false }));
  }
  const ids = await fetchTeamBasePlayerIds(teamChgkId);
  return players.map((p) => ({ ...p, isBase: playerIsBase(p.chgkId, ids) }));
}
