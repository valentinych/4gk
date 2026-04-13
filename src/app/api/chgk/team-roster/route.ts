import { NextResponse } from "next/server";
import { fetchTeamRosterInfo } from "@/lib/chgk";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = Number(searchParams.get("teamId"));
  if (!teamId || isNaN(teamId)) {
    return NextResponse.json({ basePlayers: [], recentPlayers: [] });
  }

  const info = await fetchTeamRosterInfo(teamId);
  return NextResponse.json(info);
}
