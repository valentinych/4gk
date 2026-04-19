import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchPlayerCurrentTeam } from "@/lib/chgk";

const TEAM_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

async function resolveMyTeamChgkId(
  userId: string,
  playerChgkId: number | null | undefined,
): Promise<number | null> {
  // 1. Cheapest: look for a previous self-join in EventTeam
  const selfJoin = await db.eventTeam.findFirst({
    where: { addedBy: userId, selfJoined: true },
    select: { teamChgkId: true },
    orderBy: { addedAt: "desc" },
  });
  if (selfJoin) return selfJoin.teamChgkId;

  // 2. Next cheapest: team from a past roster submission
  const rosterTeam = await db.teamRoster.findFirst({
    where: { userId, teamChgkId: { not: null } },
    select: { teamChgkId: true },
    orderBy: { submittedAt: "desc" },
  });
  if (rosterTeam?.teamChgkId) return rosterTeam.teamChgkId;

  // 3. Fallback: CHGK API (with DataCache, TTL 2 h)
  if (!playerChgkId) return null;

  const cacheKey = `player-team-chgkid-${playerChgkId}`;
  const cached = await db.dataCache.findUnique({ where: { key: cacheKey } });

  if (cached) {
    const age = Date.now() - new Date(cached.updatedAt).getTime();
    if (age < TEAM_CACHE_TTL_MS) {
      return (cached.value as { teamChgkId: number | null }).teamChgkId;
    }
  }

  const team = await fetchPlayerCurrentTeam(playerChgkId);
  const teamChgkId = team?.teamId ?? null;

  await db.dataCache.upsert({
    where: { key: cacheKey },
    create: { key: cacheKey, value: { teamChgkId } },
    update: { value: { teamChgkId } },
  });

  return teamChgkId;
}

// Returns roster counts per event for organizers,
// the list of event IDs the current user submitted a roster for,
// and event IDs where the user's team is registered in EventTeam (any adder).
export async function GET() {
  const session = await getServerSession(authOptions);
  const isOrganizer =
    session?.user?.role === "ADMIN" || session?.user?.role === "ORGANIZER";

  const result: {
    counts: Record<string, number>;
    teamCounts: Record<string, number>;
    mine: string[];
    registered: string[];
  } = { counts: {}, teamCounts: {}, mine: [], registered: [] };

  // EventTeam counts (registered teams) — visible to everyone
  const teamGrouped = await db.eventTeam.groupBy({
    by: ["eventId"],
    _count: { id: true },
  });
  for (const g of teamGrouped) {
    result.teamCounts[g.eventId] = g._count.id;
  }

  if (isOrganizer) {
    const grouped = await db.teamRoster.groupBy({
      by: ["eventId"],
      _count: { id: true },
    });
    for (const g of grouped) {
      result.counts[g.eventId] = g._count.id;
    }
  }

  if (session?.user?.id) {
    const mine = await db.teamRoster.findMany({
      where: { userId: session.user.id },
      select: { eventId: true },
    });
    result.mine = mine.map((r) => r.eventId);

    const myTeamChgkId = await resolveMyTeamChgkId(
      session.user.id,
      session.user.chgkId,
    );

    if (myTeamChgkId != null) {
      const rosterSet = new Set(result.mine);
      const entries = await db.eventTeam.findMany({
        where: { teamChgkId: myTeamChgkId },
        select: { eventId: true },
      });
      // Only include events where the roster hasn't been submitted yet
      result.registered = entries
        .map((e) => e.eventId)
        .filter((id) => !rosterSet.has(id));
    }
  }

  return NextResponse.json(result);
}
