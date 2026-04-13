import { NextResponse } from "next/server";
import { fetchTeamBasePlayerIds } from "@/lib/chgk";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = Number(searchParams.get("teamId"));
  if (!teamId || isNaN(teamId)) return NextResponse.json([]);

  const ids = await fetchTeamBasePlayerIds(teamId);
  return NextResponse.json([...ids]);
}
