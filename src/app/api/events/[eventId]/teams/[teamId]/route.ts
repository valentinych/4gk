import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ eventId: string; teamId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const entry = await db.eventTeam.findUnique({ where: { id: teamId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const isOwner = entry.addedBy === session.user.id;

  if (!isOrganizer && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (entry.withdrawnAt) {
    return NextResponse.json(
      { error: "Команда отзаявлена — редактирование недоступно" },
      { status: 400 },
    );
  }

  const body = (await req.json()) as {
    displayName?: string | null;
    playersCount?: number | null;
  };

  const data: { displayName?: string | null; playersCount?: number | null } = {};
  if ("displayName" in body) data.displayName = body.displayName?.trim() || null;
  if ("playersCount" in body) {
    const n = body.playersCount;
    data.playersCount = n != null && n >= 0 ? Math.floor(n) : null;
  }

  const updated = await db.eventTeam.update({
    where: { id: teamId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId, teamId } = await params;
  const entry = await db.eventTeam.findUnique({ where: { id: teamId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const isOwner = entry.addedBy === session.user.id;

  if (!isOrganizer && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Organizer can force a hard delete with ?hard=1 (for already-withdrawn rows).
  const hard = new URL(req.url).searchParams.get("hard") === "1";
  const wasActiveNonReserve = !entry.withdrawnAt && !entry.isReserve;

  if (hard && isOrganizer) {
    await db.eventTeam.delete({ where: { id: teamId } });
    // Also remove any submitted roster for this team so state is consistent
    await db.teamRoster.deleteMany({ where: { eventId, teamChgkId: entry.teamChgkId } });
    if (wasActiveNonReserve) await promoteTopReserve(eventId);
    return NextResponse.json({ ok: true, hardDeleted: true });
  }

  // Soft delete: mark the team as withdrawn. The row stays in the list,
  // shown at the bottom highlighted red with the withdrawal timestamp.
  const updated = await db.eventTeam.update({
    where: { id: teamId },
    data: {
      withdrawnAt: new Date(),
      withdrawnBy: session.user.id,
    },
  });

  // Drop any submitted roster for this team – a withdrawn team can't hold a roster.
  await db.teamRoster.deleteMany({ where: { eventId, teamChgkId: entry.teamChgkId } });

  if (wasActiveNonReserve) await promoteTopReserve(eventId);

  return NextResponse.json({ ok: true, entry: updated });
}

// Promote the oldest reserve team (if any) to the active list when a slot opens.
async function promoteTopReserve(eventId: string) {
  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
    select: { participantLimit: true },
  });
  if (!event?.participantLimit) return;

  const activeCount = await db.eventTeam.count({
    where: { eventId, withdrawnAt: null, isReserve: false },
  });
  if (activeCount >= event.participantLimit) return;

  const topReserve = await db.eventTeam.findFirst({
    where: { eventId, withdrawnAt: null, isReserve: true },
    orderBy: { addedAt: "asc" },
    select: { id: true },
  });
  if (!topReserve) return;

  await db.eventTeam.update({
    where: { id: topReserve.id },
    data: { isReserve: false },
  });
}
