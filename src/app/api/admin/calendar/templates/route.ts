import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/admin";

export async function GET() {
  const templates = await db.calendarTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const user = await requireOrganizer();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Имя шаблона обязательно" }, { status: 400 });
  }

  const template = await db.calendarTemplate.create({
    data: {
      name: body.name.trim(),
      title: body.title?.trim() || null,
      type: body.type || null,
      city: body.city?.trim() || null,
      venue: body.venue?.trim() || null,
      venueMapUrl: body.venueMapUrl?.trim() || null,
      description: body.description?.trim() || null,
      registrationLink: body.registrationLink?.trim() || null,
      mediaLink: body.mediaLink?.trim() || null,
      mediaLinkLabel: body.mediaLinkLabel?.trim() || null,
      startTime: body.startTime?.trim() || null,
      endTime: body.endTime?.trim() || null,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
