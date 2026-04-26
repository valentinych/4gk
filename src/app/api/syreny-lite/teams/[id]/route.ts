import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SYRENY_LITE_EVENT_ID } from "@/lib/syreny-lite";

type Params = { params: Promise<{ id: string }> };

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
