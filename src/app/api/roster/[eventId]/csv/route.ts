import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

  for (const roster of rosters) {
    for (const p of roster.players) {
      let flag = "Л";
      if (p.isCaptain) flag = "К";
      else if (p.isBase) flag = "Б";

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
