import { NextResponse } from "next/server";
import {
  musicAdminAction,
  removeMusicPlayer,
  addTeam,
  removeTeam,
} from "@/lib/music-si-store";
import { loadRoundFromDrive } from "@/lib/gdrive";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await request.json();
  const adminToken = (body.adminToken ?? "").trim();
  const action = body.action as string;

  if (!adminToken || !action)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (action === "kick") {
    const ok = removeMusicPlayer(code, adminToken, body.playerId);
    if (!ok) return NextResponse.json({ error: "Failed" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "add-team") {
    const teamName = (body.teamName ?? "").trim();
    if (!teamName)
      return NextResponse.json({ error: "Team name required" }, { status: 400 });
    const teamId = addTeam(code, adminToken, teamName);
    if (!teamId)
      return NextResponse.json({ error: "Failed" }, { status: 400 });
    return NextResponse.json({ ok: true, teamId });
  }

  if (action === "remove-team") {
    const ok = removeTeam(code, adminToken, body.teamId);
    if (!ok) return NextResponse.json({ error: "Failed" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "load-round") {
    const folderUrl = (body.folderUrl ?? "").trim();
    if (!folderUrl)
      return NextResponse.json({ error: "Folder URL required" }, { status: 400 });
    try {
      const round = await loadRoundFromDrive(folderUrl);
      const ok = musicAdminAction(code, adminToken, "load-round", {
        themes: round.themes,
      });
      if (!ok) return NextResponse.json({ error: "Failed" }, { status: 400 });
      return NextResponse.json({ ok: true, themeCount: round.themes.length });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load from Google Drive";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const payload: Record<string, unknown> = {};
  if (body.themeIndex !== undefined) payload.themeIndex = body.themeIndex;
  if (body.trackIndex !== undefined) payload.trackIndex = body.trackIndex;
  if (body.playerId !== undefined) payload.playerId = body.playerId;
  if (body.result !== undefined) payload.result = body.result;
  if (body.enabled !== undefined) payload.enabled = body.enabled;
  if (body.themes !== undefined) payload.themes = body.themes;

  const ok = musicAdminAction(code, adminToken, action, payload);
  if (!ok) return NextResponse.json({ error: "Failed" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
