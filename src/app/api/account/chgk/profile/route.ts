import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchPlayer, fetchPlayerSeasons, fetchPlayerTournaments, fetchTeam } from "@/lib/chgk";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { chgkId: true } });
  if (!user?.chgkId) {
    return NextResponse.json({ error: "No CHGK ID linked" }, { status: 404 });
  }

  const id = user.chgkId;

  const [player, seasons, tournaments] = await Promise.all([
    fetchPlayer(id),
    fetchPlayerSeasons(id),
    fetchPlayerTournaments(id),
  ]);

  let currentTeam = null;
  if (seasons.length > 0) {
    const latest = seasons.sort((a, b) => b.idseason - a.idseason)[0];
    currentTeam = await fetchTeam(latest.idteam);
  }

  return NextResponse.json({
    player,
    currentTeam,
    tournamentsCount: tournaments.length,
  });
}
