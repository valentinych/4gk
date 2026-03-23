import { NextResponse } from "next/server";
import { createMusicGame } from "@/lib/music-si-store";

export async function POST() {
  const { code, adminToken } = createMusicGame();
  return NextResponse.json({ code, adminToken });
}
