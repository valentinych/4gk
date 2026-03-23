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

  if (!adminToken || !action) {
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

  const payload: Record<string, unknown> = {};
  if (body.package) payload.package = body.package;
  if (body.settings) payload.settings = body.settings;
  if (body.theme !== undefined) payload.theme = body.theme;
  if (body.question !== undefined) payload.question = body.question;
  if (body.themeIndex !== undefined) payload.themeIndex = body.themeIndex;
  if (body.questionIndex !== undefined) payload.questionIndex = body.questionIndex;
  if (body.playerId !== undefined) payload.playerId = body.playerId;
  if (body.result !== undefined) payload.result = body.result;
  if (body.enabled !== undefined) payload.enabled = body.enabled;

  const ok = adminAction(code, adminToken, action, payload);
  if (!ok) {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
