import { NextResponse } from "next/server";
import { joinGame, gameExists } from "@/lib/buzzer-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!gameExists(code)) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const body = await request.json();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const result = joinGame(code, name);
  if (!result) {
    return NextResponse.json({ error: "Failed to join" }, { status: 400 });
  }

  return NextResponse.json(result);
}
