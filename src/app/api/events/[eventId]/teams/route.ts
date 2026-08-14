import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchPlayerCurrentTeam } from "@/lib/chgk";
import { allocateManualTeamChgkId } from "@/lib/event-teams";
import { ensureDsFridaySyncEvents, allowsDsGuestJoin, isDsFridaySync } from "@/lib/ds-friday-syncs";

type Params = { params: Promise<{ eventId: string }> };

interface RosterPlayerInput {
  chgkId?: number | null;
  lastName: string;
  firstName: string;
  patronymic?: string | null;
  isCaptain?: boolean;
  isBase?: boolean;
  sortOrder?: number;
}

function parseRosterPlayers(raw: unknown): RosterPlayerInput[] {
  if (!Array.isArray(raw)) return [];
  const players: RosterPlayerInput[] = [];
  for (const [i, p] of raw.entries()) {
    if (!p || typeof p !== "object") continue;
    const row = p as RosterPlayerInput;
    const lastName = String(row.lastName ?? "").trim();
    const firstName = String(row.firstName ?? "").trim();
    if (!lastName || !firstName) continue;
    players.push({
      chgkId: typeof row.chgkId === "number" ? row.chgkId : null,
      lastName,
      firstName,
      patronymic: row.patronymic?.trim() || null,
      isCaptain: !!row.isCaptain,
      isBase: !!row.isBase,
      sortOrder: row.sortOrder ?? i,
    });
  }
  return players;
}

async function saveOptionalRoster(opts: {
  eventId: string;
  userId: string | null;
  teamName: string;
  teamChgkId: number | null;
  city: string | null;
  players: RosterPlayerInput[];
}) {
  if (opts.players.length === 0) return;
  let userId = opts.userId;
  if (!userId) {
    const guest = await db.user.create({
      data: { name: opts.teamName, role: "PLAYER" },
    });
    userId = guest.id;
  }
  const playerRows = opts.players.map((p, i) => ({
    chgkId: p.chgkId ?? null,
    lastName: p.lastName,
    firstName: p.firstName,
    patronymic: p.patronymic,
    isCaptain: p.isCaptain ?? false,
    isBase: p.isBase ?? false,
    sortOrder: p.sortOrder ?? i,
  }));
  const fields = {
    teamName: opts.teamName,
    teamChgkId: opts.teamChgkId,
    city: opts.city,
  };

  await db.teamRoster.upsert({
    where: { eventId_userId: { eventId: opts.eventId, userId } },
    create: {
      eventId: opts.eventId,
      userId,
      ...fields,
      players: { create: playerRows },
    },
    update: {
      ...fields,
      updatedAt: new Date(),
      players: { deleteMany: {}, create: playerRows },
    },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params;

  if (isDsFridaySync(eventId) || allowsDsGuestJoin(eventId)) {
    await ensureDsFridaySyncEvents();
  }

  const session = await getServerSession(authOptions);
  const isOrganizer =
    session?.user?.role === "ADMIN" || session?.user?.role === "ORGANIZER";

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
        city: true,
        playersCount: true,
        addedBy: true,
        addedAt: true,
        withdrawnAt: true,
        isReserve: true,
        manualEntry: true,
        contactName: true,
        contactEmail: true,
        contactTelegram: true,
      },
    }),
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
      ratingUrl: event.ratingUrl,
      mediaLink: event.mediaLink,
      mediaLinkLabel: event.mediaLinkLabel,
      registrationOpensAt: event.registrationOpensAt?.toISOString() ?? null,
      registrationClosesAt: event.registrationClosesAt?.toISOString() ?? null,
      participantLimit: event.participantLimit,
      closeOnLimit: event.closeOnLimit,
      allowGuestJoin: allowsDsGuestJoin(event.id),
    },
    teams: teams.map((t) => ({
      id: t.id,
      teamChgkId: t.teamChgkId,
      teamName: t.teamName,
      displayName: t.displayName,
      city: t.city,
      playersCount: t.playersCount,
      addedBy: t.addedBy,
      addedAt: t.addedAt,
      withdrawnAt: t.withdrawnAt,
      isReserve: t.isReserve,
      manualEntry: t.manualEntry,
      hasRoster: rosterChgkIds.has(t.teamChgkId),
      ...(isOrganizer
        ? {
            contactName: t.contactName,
            contactEmail: t.contactEmail,
            contactTelegram: t.contactTelegram,
          }
        : {}),
    })),
    rosterCount: rosters.length,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { eventId } = await params;

  if (isDsFridaySync(eventId) || allowsDsGuestJoin(eventId)) {
    await ensureDsFridaySyncEvents();
  }

  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const guestJoin = allowsDsGuestJoin(eventId);
  if (!session?.user?.id && !guestJoin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    teamChgkId?: number;
    teamName?: string;
    displayName?: string | null;
    manualEntry?: boolean;
    city?: string;
    contactName?: string;
    contactEmail?: string;
    contactTelegram?: string;
    players?: unknown;
  };

  const role = session?.user?.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const userId = session?.user?.id ?? null;
  const linkedChgkId = session?.user?.chgkId ?? null;
  const telegramRequired = !isOrganizer && (!userId || !linkedChgkId);
  const rosterPlayers = parseRosterPlayers(body.players);

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
  let manualEntry = false;
  let city: string | null = null;
  let contactName: string | null = null;
  let contactEmail: string | null = null;
  let contactTelegram: string | null = null;

  const cn = body.contactName?.trim() ?? "";
  const ce = body.contactEmail?.trim() ?? "";
  const ct = body.contactTelegram?.trim() ?? "";

  if (telegramRequired && !ct) {
    return NextResponse.json(
      { error: "Укажите Telegram для связи" },
      { status: 400 },
    );
  }
  if (cn || ce || ct) {
    contactName = cn || null;
    contactEmail = ce || null;
    contactTelegram = ct || null;
  }

  if (body.manualEntry) {
    const name = body.teamName?.trim();
    if (!name) {
      return NextResponse.json({ error: "Укажите название команды" }, { status: 400 });
    }
    teamName = name;
    city = body.city?.trim() || null;
    manualEntry = true;
    teamChgkId = await allocateManualTeamChgkId(eventId);

    if (!isOrganizer && !guestJoin) {
      if (!cn) {
        return NextResponse.json({ error: "Укажите имя капитана" }, { status: 400 });
      }
      if (!ce && !ct) {
        return NextResponse.json(
          { error: "Укажите email или Telegram для связи" },
          { status: 400 },
        );
      }
    }
  } else if (body.teamChgkId && body.teamName?.trim() && (guestJoin || isOrganizer || userId)) {
    teamChgkId = Number(body.teamChgkId);
    if (!Number.isFinite(teamChgkId) || teamChgkId <= 0) {
      return NextResponse.json({ error: "Некорректный ID команды" }, { status: 400 });
    }
    teamName = body.teamName.trim();
    city = body.city?.trim() || null;
  } else if (isOrganizer) {
    return NextResponse.json({ error: "teamChgkId and teamName required" }, { status: 400 });
  } else if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { chgkId: true },
    });
    if (!user?.chgkId) {
      return NextResponse.json(
        { error: "Выберите команду из рейтинга или укажите название вручную" },
        { status: 400 },
      );
    }
    const team = await fetchPlayerCurrentTeam(user.chgkId);
    if (!team) {
      return NextResponse.json(
        { error: "Не удалось определить текущую команду в рейтинге ЧГК" },
        { status: 400 },
      );
    }
    teamChgkId = team.teamId;
    teamName = team.teamName;
  } else {
    return NextResponse.json(
      { error: "Выберите команду из рейтинга или укажите название вручную" },
      { status: 400 },
    );
  }

  const displayName = body.displayName?.trim() || null;
  const withdrawToken = !userId ? randomBytes(24).toString("hex") : undefined;

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

  const existing = await db.eventTeam.findUnique({
    where: { eventId_teamChgkId: { eventId, teamChgkId } },
  });

  async function persistRoster(teamIdForCount: string) {
    await saveOptionalRoster({
      eventId,
      userId,
      teamName,
      teamChgkId: manualEntry ? null : teamChgkId,
      city,
      players: rosterPlayers,
    });
    if (rosterPlayers.length > 0) {
      await db.eventTeam.update({
        where: { id: teamIdForCount },
        data: { playersCount: rosterPlayers.length },
      });
    }
  }

  if (existing) {
    if (existing.withdrawnAt) {
      const { isReserve, reject } = await resolveReserve();
      if (reject) return NextResponse.json({ error: reject }, { status: 403 });
      const restored = await db.eventTeam.update({
        where: { id: existing.id },
        data: {
          withdrawnAt: null,
          withdrawnBy: null,
          addedBy: userId,
          addedAt: new Date(),
          selfJoined: !isOrganizer,
          teamName,
          displayName,
          city,
          manualEntry,
          contactName,
          contactEmail,
          contactTelegram,
          playersCount: rosterPlayers.length || null,
          isReserve,
          ...(withdrawToken ? { withdrawToken } : {}),
        },
      });
      await persistRoster(restored.id);
      return NextResponse.json(
        { ...restored, withdrawToken: withdrawToken ?? restored.withdrawToken },
        { status: 200 },
      );
    }
    if (rosterPlayers.length > 0) {
      await persistRoster(existing.id);
      return NextResponse.json({ ...existing, rosterUpdated: true }, { status: 200 });
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
        city,
        manualEntry,
        contactName,
        contactEmail,
        contactTelegram,
        addedBy: userId,
        selfJoined: !isOrganizer,
        isReserve,
        playersCount: rosterPlayers.length || null,
        withdrawToken,
      },
    });
    await persistRoster(entry.id);
    return NextResponse.json({ ...entry, withdrawToken }, { status: 201 });
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
