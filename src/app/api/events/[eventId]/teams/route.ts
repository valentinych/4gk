import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchPlayerCurrentTeam } from "@/lib/chgk";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params;

  const [event, teams, rosters] = await Promise.all([
    db.calendarEvent.findUnique({ where: { id: eventId } }),
    db.eventTeam.findMany({
      where: { eventId },
      orderBy: { addedAt: "asc" },
      select: {
        id: true,
        teamChgkId: true,
        teamName: true,
        displayName: true,
        playersCount: true,
        addedBy: true,
        addedAt: true,
      },
    }),
    // TeamRoster submissions for this event – used to show "has roster" badge
    db.teamRoster.findMany({
      where: { eventId },
      select: { teamChgkId: true },
    }),
  ]);

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const rosterChgkIds = new Set(rosters.map((r) => r.teamChgkId).filter(Boolean));

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      type: event.type,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
      startTime: event.startTime,
      endTime: event.endTime,
      city: event.city,
      venue: event.venue,
      venueMapUrl: event.venueMapUrl,
      description: event.description,
      registrationLink: event.registrationLink,
      mediaLink: event.mediaLink,
      mediaLinkLabel: event.mediaLinkLabel,
    },
    teams: teams.map((t) => ({
      ...t,
      hasRoster: rosterChgkIds.has(t.teamChgkId),
    })),
    // How many rosters have been submitted total (useful for organizer)
    rosterCount: rosters.length,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = (await req.json()) as {
    teamChgkId?: number;
    teamName?: string;
    displayName?: string | null;
  };

  const role = session.user.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";

  let teamChgkId: number;
  let teamName: string;

  if (isOrganizer) {
    if (!body.teamChgkId || !body.teamName?.trim()) {
      return NextResponse.json({ error: "teamChgkId and teamName required" }, { status: 400 });
    }
    teamChgkId = body.teamChgkId;
    teamName = body.teamName.trim();
  } else {
    // Regular player — derive team from CHGK profile
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { chgkId: true },
    });
    if (!user?.chgkId) {
      return NextResponse.json(
        { error: "Привяжите CHGK ID в настройках профиля, чтобы присоединиться" },
        { status: 400 },
      );
    }
    const team = await fetchPlayerCurrentTeam(user.chgkId);
    if (!team) {
      return NextResponse.json(
        { error: "Не удалось определить текущую команду в рейтинге ЧГКÄ" },
        { status: 400 },
      );
    }
    teamChgkId = team.teamId;
    teamName = team.teamName;
  }

  const displayName = body.displayName?.trim() || null;

  try {
    const entry = await db.eventTeam.create({
      data: {
        eventId,
        teamChgkId,
        teamName,
        displayName,
        addedBy: session.user.id,
        selfJoined: !isOrganizer,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Эта команда уже добавлена к событию" },
        { status: 409 },
      );
    }
    throw err;
  }
}
