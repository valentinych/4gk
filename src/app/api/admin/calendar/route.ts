import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/admin";

export async function GET() {
  const events = await db.calendarEvent.findMany({
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const user = await requireOrganizer();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }
  if (!body.startDate) {
    return NextResponse.json({ error: "Дата начала обязательна" }, { status: 400 });
  }
  if (!body.city?.trim()) {
    return NextResponse.json({ error: "Город обязателен" }, { status: 400 });
  }

  const limitRaw = body.participantLimit;
  const limit = limitRaw === null || limitRaw === undefined || limitRaw === ""
    ? null
    : Number(limitRaw);
  if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
    return NextResponse.json({ error: "Лимит должен быть положительным числом" }, { status: 400 });
  }

  const event = await db.calendarEvent.create({
    data: {
      title: body.title.trim(),
      type: body.type || "one-day",
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      startTime: body.startTime?.trim() || null,
      endTime: body.endTime?.trim() || null,
      city: body.city.trim(),
      venue: body.venue?.trim() || null,
      venueMapUrl: body.venueMapUrl?.trim() || null,
      description: body.description?.trim() || null,
      registrationLink: body.registrationLink?.trim() || null,
      ratingUrl: body.ratingUrl?.trim() || null,
      mediaLink: body.mediaLink?.trim() || null,
      mediaLinkLabel: body.mediaLinkLabel?.trim() || null,
      registrationOpensAt: body.registrationOpensAt ? new Date(body.registrationOpensAt) : null,
      registrationClosesAt: body.registrationClosesAt ? new Date(body.registrationClosesAt) : null,
      participantLimit: limit,
      closeOnLimit: Boolean(body.closeOnLimit),
    },
  });

  return NextResponse.json(event, { status: 201 });
}
