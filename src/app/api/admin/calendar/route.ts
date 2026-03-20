import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const events = await db.calendarEvent.findMany({
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  const event = await db.calendarEvent.create({
    data: {
      title: body.title.trim(),
      type: body.type || "tournament",
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      city: body.city.trim(),
      venue: body.venue?.trim() || null,
      venueMapUrl: body.venueMapUrl?.trim() || null,
      description: body.description?.trim() || null,
      registrationLink: body.registrationLink?.trim() || null,
      mediaLink: body.mediaLink?.trim() || null,
      mediaLinkLabel: body.mediaLinkLabel?.trim() || null,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
