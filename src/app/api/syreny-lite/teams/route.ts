import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchChgkGgRatings } from "@/lib/chgk-gg";
import {
  SYRENY_LITE_EVENT_ID,
  allocateManualTeamChgkId,
  ensureSyrenyLiteEvent,
} from "@/lib/syreny-lite";

export const dynamic = "force-dynamic";

export async function GET() {
  const event = await ensureSyrenyLiteEvent();

  const teams = await db.eventTeam.findMany({
    where: { eventId: SYRENY_LITE_EVENT_ID, withdrawnAt: null },
    orderBy: { addedAt: "asc" },
    select: {
      id: true,
      teamChgkId: true,
      teamName: true,
      displayName: true,
      city: true,
      manualEntry: true,
      addedAt: true,
    },
  });

  const realIds = teams
    .filter((t) => !t.manualEntry && t.teamChgkId > 0)
    .map((t) => t.teamChgkId);

  const { map: ratings, releaseDate } = await fetchChgkGgRatings(realIds);

  const enriched = teams.map((t) => {
    const r = !t.manualEntry && t.teamChgkId > 0 ? ratings.get(t.teamChgkId) : null;
    return {
      id: t.id,
      teamChgkId: t.manualEntry ? null : t.teamChgkId,
      teamName: t.displayName ?? t.teamName,
      city: t.city ?? "",
      manualEntry: t.manualEntry,
      addedAt: t.addedAt.toISOString(),
      ratingPosition: r?.position ?? null,
      ratingScore: r?.score ?? null,
    };
  });

  // Sort: manual / no-rating first (in registration order), then by ratingPosition
  // descending (worst rating place first → best last).
  const sorted = [...enriched].sort((a, b) => {
    const aNoRating = a.manualEntry || a.ratingPosition == null;
    const bNoRating = b.manualEntry || b.ratingPosition == null;
    if (aNoRating && !bNoRating) return -1;
    if (!aNoRating && bNoRating) return 1;
    if (aNoRating && bNoRating) return a.addedAt < b.addedAt ? -1 : 1;
    return (b.ratingPosition as number) - (a.ratingPosition as number);
  });

  return NextResponse.json({
    teams: sorted,
    ratingReleaseDate: releaseDate,
    registrationOpensAt: event.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: event.registrationClosesAt?.toISOString() ?? null,
  });
}

interface PostBody {
  manualEntry?: boolean;
  teamChgkId?: number;
  teamName?: string;
  city?: string;
  contactName?: string;
  contactEmail?: string;
  contactTelegram?: string;
}

export async function POST(req: Request) {
  const event = await ensureSyrenyLiteEvent();

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  // Registration window check — applies to everyone except organizers.
  const role = session?.user?.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  if (!isOrganizer && event.registrationOpensAt && new Date() < event.registrationOpensAt) {
    return NextResponse.json(
      {
        error: "Приём заявок ещё не открыт",
        registrationOpensAt: event.registrationOpensAt.toISOString(),
      },
      { status: 403 },
    );
  }

  const body = (await req.json()) as PostBody;

  const contactName = body.contactName?.trim() ?? "";
  const contactEmail = body.contactEmail?.trim() ?? "";
  const contactTelegram = body.contactTelegram?.trim() ?? "";

  if (!contactName) {
    return NextResponse.json({ error: "Укажите имя капитана" }, { status: 400 });
  }
  if (!contactEmail && !contactTelegram) {
    return NextResponse.json(
      { error: "Укажите email или Telegram для связи" },
      { status: 400 },
    );
  }

  let teamChgkId: number;
  let teamName: string;
  let city: string;
  let manualEntry = false;

  if (body.manualEntry) {
    const name = body.teamName?.trim();
    if (!name) {
      return NextResponse.json({ error: "Укажите название команды" }, { status: 400 });
    }
    teamName = name;
    city = body.city?.trim() ?? "";
    manualEntry = true;
    teamChgkId = await allocateManualTeamChgkId(SYRENY_LITE_EVENT_ID);
  } else {
    const id = Number(body.teamChgkId);
    const name = body.teamName?.trim();
    if (!id || id <= 0 || !name) {
      return NextResponse.json(
        { error: "Выберите команду из списка ЧГК или включите ручной ввод" },
        { status: 400 },
      );
    }
    teamChgkId = id;
    teamName = name;
    city = body.city?.trim() ?? "";

    const existing = await db.eventTeam.findUnique({
      where: {
        eventId_teamChgkId: { eventId: SYRENY_LITE_EVENT_ID, teamChgkId: id },
      },
    });
    if (existing && !existing.withdrawnAt) {
      return NextResponse.json(
        { error: "Эта команда уже заявлена" },
        { status: 409 },
      );
    }
    if (existing?.withdrawnAt) {
      // Restore previously withdrawn registration with a fresh token.
      const withdrawToken = randomBytes(24).toString("hex");
      const restored = await db.eventTeam.update({
        where: { id: existing.id },
        data: {
          withdrawnAt: null,
          withdrawnBy: null,
          addedBy: userId,
          addedAt: new Date(),
          selfJoined: !isOrganizer,
          teamName,
          city,
          contactName,
          contactEmail: contactEmail || null,
          contactTelegram: contactTelegram || null,
          withdrawToken,
        },
      });
      return NextResponse.json({
        id: restored.id,
        withdrawToken,
      });
    }
  }

  const withdrawToken = randomBytes(24).toString("hex");

  const entry = await db.eventTeam.create({
    data: {
      eventId: SYRENY_LITE_EVENT_ID,
      teamChgkId,
      teamName,
      city,
      manualEntry,
      addedBy: userId,
      selfJoined: !isOrganizer,
      contactName,
      contactEmail: contactEmail || null,
      contactTelegram: contactTelegram || null,
      withdrawToken,
    },
  });

  return NextResponse.json(
    { id: entry.id, withdrawToken },
    { status: 201 },
  );
}
