import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Returns roster counts per event for organizers,
// the list of event IDs the current user submitted a roster for,
// and event IDs where the user's team is registered (EventTeam).
export async function GET() {
  const session = await getServerSession(authOptions);
  const isOrganizer =
    session?.user?.role === "ADMIN" || session?.user?.role === "ORGANIZER";

  const result: {
    counts: Record<string, number>;
    mine: string[];
    registered: string[];
  } = { counts: {}, mine: [], registered: [] };

  if (isOrganizer) {
    const grouped = await db.teamRoster.groupBy({
      by: ["eventId"],
      _count: { id: true },
    });
    for (const g of grouped) {
      result.counts[g.eventId] = g._count.id;
    }
  }

  if (session?.user?.id) {
    const [mine, registered] = await Promise.all([
      db.teamRoster.findMany({
        where: { userId: session.user.id },
        select: { eventId: true },
      }),
      db.eventTeam.findMany({
        where: { addedBy: session.user.id },
        select: { eventId: true },
      }),
    ]);
    result.mine = mine.map((r) => r.eventId);
    result.registered = registered.map((r) => r.eventId);
  }

  return NextResponse.json(result);
}
