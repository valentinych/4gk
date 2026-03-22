import { NextResponse } from "next/server";
import { buzz } from "@/lib/buzzer-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await request.json();
  const playerId = (body.playerId ?? "").trim();

  if (!playerId) {
    return NextResponse.json(
      { error: "playerId required" },
      { status: 400 },
    );
  }

  const result = buzz(code, playerId);
  if (!result) {
    return NextResponse.json(
      { error: "Cannot buzz" },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
