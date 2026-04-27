import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SYRENY_LITE_EVENT_ID } from "@/lib/syreny-lite";

type Params = { params: Promise<{ id: string }> };

/** Returns the full row data (incl. contacts) to its owner (token) or admins. */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const entry = await db.eventTeam.findUnique({ where: { id } });
  if (!entry || entry.eventId !== SYRENY_LITE_EVENT_ID || entry.withdrawnAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const tokenMatches = !!token && !!entry.withdrawToken && token === entry.withdrawToken;

  if (!isOrganizer && !tokenMatches) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: entry.id,
    teamName: entry.teamName,
    teamChgkId: entry.manualEntry ? null : entry.teamChgkId,
    city: entry.city ?? "",
    manualEntry: entry.manualEntry,
    contactName: entry.contactName ?? "",
    contactEmail: entry.contactEmail ?? "",
    contactTelegram: entry.contactTelegram ?? "",
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const entry = await db.eventTeam.findUnique({ where: { id } });
  if (!entry || entry.eventId !== SYRENY_LITE_EVENT_ID) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.withdrawnAt) {
    return NextResponse.json({ error: "Заявка уже отозвана" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const tokenMatches = !!token && !!entry.withdrawToken && token === entry.withdrawToken;

  if (!isOrganizer && !tokenMatches) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.eventTeam.update({
    where: { id },
    data: {
      withdrawnAt: new Date(),
      withdrawnBy: session?.user?.id ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

interface PatchBody {
  /** Только для manualEntry — для не-manual игнорируется. */
  teamName?: string;
  city?: string;
  contactName?: string;
  contactEmail?: string;
  contactTelegram?: string;
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const entry = await db.eventTeam.findUnique({ where: { id } });
  if (!entry || entry.eventId !== SYRENY_LITE_EVENT_ID) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.withdrawnAt) {
    return NextResponse.json({ error: "Заявка отозвана" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const tokenMatches = !!token && !!entry.withdrawToken && token === entry.withdrawToken;

  if (!isOrganizer && !tokenMatches) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as PatchBody;

  const contactName = body.contactName?.trim();
  const contactEmail = body.contactEmail?.trim() ?? "";
  const contactTelegram = body.contactTelegram?.trim() ?? "";

  if (contactName !== undefined && !contactName) {
    return NextResponse.json({ error: "Укажите имя капитана" }, { status: 400 });
  }
  // Require at least one channel only when contact fields are being updated.
  const touchingContacts =
    body.contactName !== undefined ||
    body.contactEmail !== undefined ||
    body.contactTelegram !== undefined;
  if (touchingContacts && !contactEmail && !contactTelegram) {
    return NextResponse.json(
      { error: "Укажите email или Telegram для связи" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (entry.manualEntry && body.teamName !== undefined) {
    const name = body.teamName.trim();
    if (!name) {
      return NextResponse.json({ error: "Укажите название команды" }, { status: 400 });
    }
    data.teamName = name;
  }
  if (body.city !== undefined) data.city = body.city.trim();
  if (body.contactName !== undefined) data.contactName = contactName;
  if (body.contactEmail !== undefined) data.contactEmail = contactEmail || null;
  if (body.contactTelegram !== undefined) data.contactTelegram = contactTelegram || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет изменений" }, { status: 400 });
  }

  await db.eventTeam.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
