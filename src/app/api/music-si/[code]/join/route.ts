import { NextResponse } from "next/server";
import { joinMusicGame, musicGameExists } from "@/lib/music-si-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!musicGameExists(code)) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const body = await request.json();
  const name = (body.name ?? "").trim();
  const teamId = (body.teamId ?? "").trim();

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!teamId) return NextResponse.json({ error: "Team required" }, { status: 400 });

  const result = joinMusicGame(code, name, teamId);
  if (!result) return NextResponse.json({ error: "Failed to join" }, { status: 400 });

  return NextResponse.json(result);
}
