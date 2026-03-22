import { NextResponse } from "next/server";
import { adminAction, removePlayer } from "@/lib/buzzer-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await request.json();
  const adminToken = (body.adminToken ?? "").trim();
  const action = body.action as string;

  if (!adminToken) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "kick") {
    const playerId = (body.playerId ?? "").trim();
    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }
    const ok = removePlayer(code, adminToken, playerId);
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!["open", "close", "clear"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const ok = adminAction(code, adminToken, action as "open" | "close" | "clear");
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
