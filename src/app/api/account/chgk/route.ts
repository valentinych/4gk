import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchPlayer } from "@/lib/chgk";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chgkId } = await req.json();

  if (!chgkId || typeof chgkId !== "number") {
    return NextResponse.json({ error: "chgkId must be a number" }, { status: 400 });
  }

  const player = await fetchPlayer(chgkId);
  if (!player) {
    return NextResponse.json({ error: "Player not found on rating.chgk.info" }, { status: 404 });
  }

  const existing = await db.user.findFirst({
    where: { chgkId, NOT: { id: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "This CHGK ID is already linked to another account" }, { status: 409 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { chgkId },
  });

  return NextResponse.json({ ok: true, player });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { chgkId: null },
  });

  return NextResponse.json({ ok: true });
}
