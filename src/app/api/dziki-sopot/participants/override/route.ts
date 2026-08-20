import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchDsParticipants } from "@/lib/ds-participants";
import {
  normalizeParticipantKey,
  participantKey,
  setDsOverride,
} from "@/lib/ds-participants-overrides";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { key?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, action } = body;
  if (!key || (action !== "remove" && action !== "confirm")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { participants } = await fetchDsParticipants();
  const canonical = normalizeParticipantKey(key);
  const validKeys = new Set(participants.map((p) => participantKey(p)));
  if (!validKeys.has(canonical)) {
    return NextResponse.json({ error: "Unknown participant" }, { status: 404 });
  }

  const overrides = await setDsOverride(canonical, action);
  return NextResponse.json({ ok: true, overrides });
}
