import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { fetchDsParticipants } from "@/lib/ds-participants";
import { participantKey } from "@/lib/ds-participants-overrides";
import { DS_MAIN_EVENT_ID } from "@/lib/dziki-sopot-seasons";
import { allocateManualTeamChgkId } from "@/lib/event-teams";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { key?: string; displayName?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = body.key;
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const nextName =
    typeof body.displayName === "string" ? body.displayName.trim() || null : null;

  const { participants } = await fetchDsParticipants();
  const p = participants.find((row) => participantKey(row) === key);
  if (!p) {
    return NextResponse.json({ error: "Unknown participant" }, { status: 404 });
  }

  let entry =
    p.teamId > 0
      ? await db.eventTeam.findUnique({
          where: {
            eventId_teamChgkId: { eventId: DS_MAIN_EVENT_ID, teamChgkId: p.teamId },
          },
        })
      : await db.eventTeam.findFirst({
          where: {
            eventId: DS_MAIN_EVENT_ID,
            OR: [{ teamName: p.team }, { displayName: p.team }],
          },
        });

  if (!entry && !nextName) {
    return NextResponse.json({ ok: true, displayName: null });
  }

  if (!entry) {
    const teamChgkId =
      p.teamId > 0 ? p.teamId : await allocateManualTeamChgkId(DS_MAIN_EVENT_ID);
    try {
      entry = await db.eventTeam.create({
        data: {
          eventId: DS_MAIN_EVENT_ID,
          teamChgkId,
          teamName: p.team,
          displayName: nextName,
          city: p.city || null,
          manualEntry: p.teamId <= 0,
          addedBy: admin.id,
          selfJoined: false,
        },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== "P2002") throw err;
      entry = await db.eventTeam.findUnique({
        where: {
          eventId_teamChgkId: { eventId: DS_MAIN_EVENT_ID, teamChgkId },
        },
      });
      if (!entry) throw err;
    }
  }

  if (entry.displayName !== nextName) {
    entry = await db.eventTeam.update({
      where: { id: entry.id },
      data: { displayName: nextName },
    });
  }

  return NextResponse.json({ ok: true, displayName: entry.displayName });
}
