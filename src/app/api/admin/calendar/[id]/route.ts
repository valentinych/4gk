import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  if (body.city !== undefined) data.city = body.city.trim();
  if (body.venue !== undefined) data.venue = body.venue?.trim() || null;
  if (body.venueMapUrl !== undefined) data.venueMapUrl = body.venueMapUrl?.trim() || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.registrationLink !== undefined) data.registrationLink = body.registrationLink?.trim() || null;
  if (body.mediaLink !== undefined) data.mediaLink = body.mediaLink?.trim() || null;
  if (body.mediaLinkLabel !== undefined) data.mediaLinkLabel = body.mediaLinkLabel?.trim() || null;

  const updated = await db.calendarEvent.update({ where: { id }, data });
  return NextResponse.json(updated);
}
