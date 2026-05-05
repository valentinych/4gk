import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireOrganizer();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.calendarTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Имя шаблона обязательно" }, { status: 400 });
  }

  const updated = await db.calendarTemplate.update({
    where: { id },
    data: {
      name: body.name.trim(),
      title: body.title?.trim() || null,
      type: body.type || null,
      city: body.city?.trim() || null,
      venue: body.venue?.trim() || null,
      venueMapUrl: body.venueMapUrl?.trim() || null,
      description: body.description?.trim() || null,
      registrationLink: body.registrationLink?.trim() || null,
      ratingUrl: body.ratingUrl?.trim() || null,
      mediaLink: body.mediaLink?.trim() || null,
      mediaLinkLabel: body.mediaLinkLabel?.trim() || null,
      startTime: body.startTime?.trim() || null,
      endTime: body.endTime?.trim() || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireOrganizer();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const template = await db.calendarTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.calendarTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
