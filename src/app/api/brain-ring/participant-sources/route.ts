import { NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin";
import { db } from "@/lib/db";
import { isPrismaMissingTable } from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireModerator();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eventId = new URL(req.url).searchParams.get("eventId")?.trim() ?? "";

  try {
    if (eventId) {
      const teams = await db.eventTeam.findMany({
        where: { eventId, withdrawnAt: null },
        orderBy: { addedAt: "asc" },
        select: { teamName: true, displayName: true },
      });
      return NextResponse.json({
        names: teams.map((t) => (t.displayName || t.teamName).trim()).filter(Boolean),
      });
    }

    const events = await db.calendarEvent.findMany({
      orderBy: { startDate: "desc" },
      take: 40,
      select: { id: true, title: true, startDate: true },
    });
    const counts = await db.eventTeam.groupBy({
      by: ["eventId"],
      where: { withdrawnAt: null, eventId: { in: events.map((e) => e.id) } },
      _count: { _all: true },
    });
    const countById = new Map(counts.map((c) => [c.eventId, c._count._all]));
    return NextResponse.json({
      events: events
        .map((e) => ({
          id: e.id,
          title: e.title,
          teamCount: countById.get(e.id) ?? 0,
        }))
        .filter((e) => e.teamCount > 0),
    });
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json({ events: [] });
    }
    console.error("brain-ring participant-sources failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
