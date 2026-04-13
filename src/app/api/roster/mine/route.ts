import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rosters = await db.teamRoster.findMany({
    where: { userId: session.user.id },
    include: {
      event: { select: { title: true, startDate: true, city: true } },
      players: { select: { id: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(rosters);
}
