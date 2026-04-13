import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchPlayerCurrentTeam, fetchTeamRosterInfo, fetchPlayerSeasons } from "@/lib/chgk";

export async function GET() {
  await cookies();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const chgkId = session.user.chgkId;
  const result: Record<string, unknown> = {
    userId: session.user.id,
    chgkId,
  };

  if (!chgkId) {
    return NextResponse.json({ ...result, error: "chgkId is null/undefined in session" });
  }

  // Step 1: fetch player seasons
  const seasons = await fetchPlayerSeasons(chgkId);
  result.seasonsCount = seasons.length;
  result.lastSeason = seasons.slice(-1)[0] ?? null;
  result.firstSeason = seasons[0] ?? null;

  // Step 2: fetch current team
  let currentTeam = null;
  try {
    currentTeam = await fetchPlayerCurrentTeam(chgkId);
  } catch (e) {
    result.fetchCurrentTeamError = String(e);
  }
  result.currentTeam = currentTeam;

  if (!currentTeam) {
    return NextResponse.json({ ...result, error: "fetchPlayerCurrentTeam returned null" });
  }

  // Step 3: fetch team roster info
  let rosterInfo = null;
  try {
    rosterInfo = await fetchTeamRosterInfo(currentTeam.teamId);
  } catch (e) {
    result.fetchRosterInfoError = String(e);
  }
  result.basePlayersCount = rosterInfo?.basePlayers?.length ?? 0;
  result.recentPlayersCount = rosterInfo?.recentPlayers?.length ?? 0;
  result.basePlayers = rosterInfo?.basePlayers ?? [];

  return NextResponse.json(result);
}
