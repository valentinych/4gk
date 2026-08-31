import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  loadBasePlayerIdsByTeam,
  playerIsBase,
  rosterFlag,
} from "@/lib/roster-flags";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  const isOrganizer =
    session?.user?.role === "ADMIN" || session?.user?.role === "ORGANIZER";

  if (!isOrganizer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await params;

  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const rosters = await db.teamRoster.findMany({
    where: { eventId },
    include: { players: { orderBy: { sortOrder: "asc" } } },
    orderBy: { submittedAt: "asc" },
  });

  const BOM = "\uFEFF";
  const rows: string[] = [];
  const baseByTeam = await loadBasePlayerIdsByTeam(rosters.map((r) => r.teamChgkId));

  for (const roster of rosters) {
    const currentSeasonIds =
      roster.teamChgkId != null && roster.teamChgkId > 0
        ? (baseByTeam.get(roster.teamChgkId) ?? new Set<number>())
        : null;
    const useRating = currentSeasonIds != null && currentSeasonIds.size > 0;
    for (const p of roster.players) {
      const isBase = useRating ? playerIsBase(p.chgkId, currentSeasonIds) : p.isBase;
      const flag = rosterFlag(isBase);

      const cols = [
        roster.teamChgkId ?? "",
        roster.teamName,
        roster.city ?? "",
        flag,
        p.chgkId ?? "",
        p.lastName,
        p.firstName,
        p.patronymic ?? "",
      ].map((v) => String(v).replace(/;/g, ","));

      rows.push(cols.join(";"));
    }
  }

  const csv = BOM + rows.join("\n");
  const safeTitle = event.title.replace(/[^а-яёА-ЯЁa-zA-Z0-9_\- ]/g, "").trim() || eventId;
  const filename = `roster_${safeTitle}_${event.startDate.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
