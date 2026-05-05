import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/admin";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrganizer();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const event = await db.calendarEvent.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrganizer();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.calendarEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.type !== undefined) data.type = body.type;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.startTime !== undefined) data.startTime = body.startTime?.trim() || null;
  if (body.endTime !== undefined) data.endTime = body.endTime?.trim() || null;
  if (body.city !== undefined) data.city = body.city.trim();
  if (body.venue !== undefined) data.venue = body.venue?.trim() || null;
  if (body.venueMapUrl !== undefined) data.venueMapUrl = body.venueMapUrl?.trim() || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.registrationLink !== undefined) data.registrationLink = body.registrationLink?.trim() || null;
  if (body.ratingUrl !== undefined) data.ratingUrl = body.ratingUrl?.trim() || null;
  if (body.mediaLink !== undefined) data.mediaLink = body.mediaLink?.trim() || null;
  if (body.mediaLinkLabel !== undefined) data.mediaLinkLabel = body.mediaLinkLabel?.trim() || null;
  if (body.registrationOpensAt !== undefined) {
    data.registrationOpensAt = body.registrationOpensAt ? new Date(body.registrationOpensAt) : null;
  }
  if (body.registrationClosesAt !== undefined) {
    data.registrationClosesAt = body.registrationClosesAt ? new Date(body.registrationClosesAt) : null;
  }
  if (body.participantLimit !== undefined) {
    const v = body.participantLimit;
    if (v === null || v === "") {
      data.participantLimit = null;
    } else {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json({ error: "Лимит должен быть положительным числом" }, { status: 400 });
      }
      data.participantLimit = n;
    }
  }
  if (body.closeOnLimit !== undefined) data.closeOnLimit = Boolean(body.closeOnLimit);

  const updated = await db.calendarEvent.update({ where: { id }, data });

  // If the participant limit was raised (or removed), promote reserve teams
  // to fill the newly opened slots.
  if (
    "participantLimit" in data &&
    (data.participantLimit === null ||
      (typeof data.participantLimit === "number" &&
        (existing.participantLimit == null ||
          data.participantLimit > existing.participantLimit)))
  ) {
    await promoteReserves(id, updated.participantLimit);
  }

  return NextResponse.json(updated);
}

async function promoteReserves(eventId: string, limit: number | null) {
  const activeCount = await db.eventTeam.count({
    where: { eventId, withdrawnAt: null, isReserve: false },
  });
  // null limit means "unlimited" – promote all reserves.
  const slots = limit == null ? Number.POSITIVE_INFINITY : limit - activeCount;
  if (slots <= 0) return;

  const reserves = await db.eventTeam.findMany({
    where: { eventId, withdrawnAt: null, isReserve: true },
    orderBy: { addedAt: "asc" },
    take: Number.isFinite(slots) ? slots : undefined,
    select: { id: true },
  });
  if (reserves.length === 0) return;

  await db.eventTeam.updateMany({
    where: { id: { in: reserves.map((r) => r.id) } },
    data: { isReserve: false },
  });
}
