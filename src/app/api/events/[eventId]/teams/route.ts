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
        withdrawnAt: true,
        isReserve: true,
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
      registrationOpensAt: event.registrationOpensAt?.toISOString() ?? null,
      registrationClosesAt: event.registrationClosesAt?.toISOString() ?? null,
      participantLimit: event.participantLimit,
      closeOnLimit: event.closeOnLimit,
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

  // Enforce registration window for non-organizers
  if (!isOrganizer) {
    const now = new Date();
    if (event.registrationOpensAt && now < event.registrationOpensAt) {
      return NextResponse.json(
        {
          error: "Приём заявок ещё не открыт",
          reason: "not_yet_open",
          registrationOpensAt: event.registrationOpensAt.toISOString(),
        },
        { status: 403 },
      );
    }
    if (event.registrationClosesAt && now > event.registrationClosesAt) {
      return NextResponse.json(
        {
          error: "Приём заявок на это событие уже закрыт",
          reason: "closed_by_time",
          registrationClosesAt: event.registrationClosesAt.toISOString(),
        },
        { status: 403 },
      );
    }
  }

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

  // Determine if this new (or restored) registration should be a reserve
  async function resolveReserve(): Promise<{ isReserve: boolean; reject?: string }> {
    if (!event!.participantLimit) return { isReserve: false };
    const activeCount = await db.eventTeam.count({
      where: { eventId, withdrawnAt: null, isReserve: false },
    });
    if (activeCount >= event!.participantLimit) {
      if (event!.closeOnLimit) {
        return {
          isReserve: false,
          reject: "Лимит участников достигнут — приём заявок закрыт",
        };
      }
      return { isReserve: true };
    }
    return { isReserve: false };
  }

  // If the team was previously withdrawn for this event, restore the entry
  // (clears withdrawnAt, updates adder/timestamp)
  const existing = await db.eventTeam.findUnique({
    where: { eventId_teamChgkId: { eventId, teamChgkId } },
  });

  if (existing) {
    if (existing.withdrawnAt) {
      const { isReserve, reject } = await resolveReserve();
      if (reject) return NextResponse.json({ error: reject }, { status: 403 });
      const restored = await db.eventTeam.update({
        where: { id: existing.id },
        data: {
          withdrawnAt: null,
          withdrawnBy: null,
          addedBy: session.user.id,
          addedAt: new Date(),
          selfJoined: !isOrganizer,
          teamName,
          displayName,
          playersCount: null,
          isReserve,
        },
      });
      return NextResponse.json(restored, { status: 200 });
    }
    return NextResponse.json(
      { error: "Эта команда уже добавлена к событию" },
      { status: 409 },
    );
  }

  const { isReserve, reject } = await resolveReserve();
  if (reject) return NextResponse.json({ error: reject }, { status: 403 });

  try {
    const entry = await db.eventTeam.create({
      data: {
        eventId,
        teamChgkId,
        teamName,
        displayName,
        addedBy: session.user.id,
        selfJoined: !isOrganizer,
        isReserve,
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
