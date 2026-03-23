import { NextResponse } from "next/server";
import { musicBuzz } from "@/lib/music-si-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await request.json();
  const playerId = (body.playerId ?? "").trim();
  const trackTimeMs = Number(body.trackTimeMs ?? 0);

  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  const ok = musicBuzz(code, playerId, trackTimeMs);
  if (!ok) return NextResponse.json({ error: "Cannot buzz" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
