import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { fetchPlayer } from "@/lib/chgk";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if ("role" in body) {
    if (!["PLAYER", "MODERATOR", "ORGANIZER", "ADMIN"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (id === admin.id && body.role !== "ADMIN") {
      return NextResponse.json({ error: "Cannot remove your own admin role" }, { status: 400 });
    }
    data.role = body.role;
  }

  if ("chgkId" in body) {
    if (body.chgkId !== null) {
      const chgkId = Number(body.chgkId);
      if (!chgkId || chgkId <= 0) {
        return NextResponse.json({ error: "Invalid CHGK ID" }, { status: 400 });
      }

      const player = await fetchPlayer(chgkId);
      if (!player) {
        return NextResponse.json({ error: "Player not found on rating.chgk.info" }, { status: 404 });
      }

      const existing = await db.user.findFirst({
        where: { chgkId, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "This CHGK ID is already linked to another user" }, { status: 409 });
      }

      data.chgkId = chgkId;
    } else {
      data.chgkId = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      chgkId: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}
