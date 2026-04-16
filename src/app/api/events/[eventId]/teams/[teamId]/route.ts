import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ eventId: string; teamId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const entry = await db.eventTeam.findUnique({ where: { id: teamId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const isOwner = entry.addedBy === session.user.id;

  if (!isOrganizer && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { displayName?: string | null };
  const updated = await db.eventTeam.update({
    where: { id: teamId },
    data: { displayName: body.displayName?.trim() || null },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const entry = await db.eventTeam.findUnique({ where: { id: teamId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const isOwner = entry.addedBy === session.user.id;

  if (!isOrganizer && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.eventTeam.delete({ where: { id: teamId } });
  return NextResponse.json({ ok: true });
}
