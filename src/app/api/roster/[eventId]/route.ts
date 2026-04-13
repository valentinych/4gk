import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { eventId } = await params;

  const isOrganizer =
    session?.user?.role === "ADMIN" || session?.user?.role === "ORGANIZER";

  if (isOrganizer) {
    const rosters = await db.teamRoster.findMany({
      where: { eventId },
      include: { players: { orderBy: { sortOrder: "asc" } }, user: { select: { name: true, email: true } } },
      orderBy: { submittedAt: "asc" },
    });
    return NextResponse.json(rosters);
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roster = await db.teamRoster.findUnique({
    where: { eventId_userId: { eventId, userId: session.user.id } },
    include: { players: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(roster ?? null);
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;

  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await req.json() as {
    teamName: string;
    teamChgkId?: number | null;
    city?: string | null;
    players: Array<{
      chgkId?: number | null;
      lastName: string;
      firstName: string;
      patronymic?: string | null;
      isCaptain?: boolean;
      isBase?: boolean;
      sortOrder?: number;
    }>;
  };

  if (!body.teamName?.trim()) {
    return NextResponse.json({ error: "teamName is required" }, { status: 400 });
  }
  if (!body.players?.length) {
    return NextResponse.json({ error: "At least one player is required" }, { status: 400 });
  }

  const roster = await db.teamRoster.upsert({
    where: { eventId_userId: { eventId, userId: session.user.id } },
    create: {
      eventId,
      userId: session.user.id,
      teamName: body.teamName.trim(),
      teamChgkId: body.teamChgkId ?? null,
      city: body.city?.trim() || null,
      players: {
        create: body.players.map((p, i) => ({
          chgkId: p.chgkId ?? null,
          lastName: p.lastName.trim(),
          firstName: p.firstName.trim(),
          patronymic: p.patronymic?.trim() || null,
          isCaptain: p.isCaptain ?? false,
          isBase: p.isBase ?? false,
          sortOrder: p.sortOrder ?? i,
        })),
      },
    },
    update: {
      teamName: body.teamName.trim(),
      teamChgkId: body.teamChgkId ?? null,
      city: body.city?.trim() || null,
      updatedAt: new Date(),
      players: {
        deleteMany: {},
        create: body.players.map((p, i) => ({
          chgkId: p.chgkId ?? null,
          lastName: p.lastName.trim(),
          firstName: p.firstName.trim(),
          patronymic: p.patronymic?.trim() || null,
          isCaptain: p.isCaptain ?? false,
          isBase: p.isBase ?? false,
          sortOrder: p.sortOrder ?? i,
        })),
      },
    },
    include: { players: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(roster);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;

  await db.teamRoster.deleteMany({
    where: { eventId, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
