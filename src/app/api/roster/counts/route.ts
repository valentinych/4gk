import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Returns roster counts per event for organizers,
// and the list of event IDs the current user submitted for.
export async function GET() {
  const session = await getServerSession(authOptions);
  const isOrganizer =
    session?.user?.role === "ADMIN" || session?.user?.role === "ORGANIZER";

  const result: {
    counts: Record<string, number>;
    mine: string[];
  } = { counts: {}, mine: [] };

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
    const mine = await db.teamRoster.findMany({
      where: { userId: session.user.id },
      select: { eventId: true },
    });
    result.mine = mine.map((r) => r.eventId);
  }

  return NextResponse.json(result);
}
