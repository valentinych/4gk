import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchChgkGgRatings } from "@/lib/chgk-gg";
import {
  SYRENY_LITE_EVENT_ID,
  SYRENY_LITE_HIDDEN_TEAM_NAMES,
  applySyrenyLiteDisplayName,
  isOutOfCompetition,
  normalizeSyrenyLiteName,
} from "@/lib/syreny-lite";
import {
  advancePlayoffFromGroups,
  initBrainTournament,
  resetBrainTournament,
  setActiveMatch,
  setCapture,
  setPlayoffTeams,
} from "@/lib/syreny-lite-brain-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function canModerate(role: string | undefined): boolean {
  return role === "MODERATOR" || role === "ORGANIZER" || role === "ADMIN";
}

async function loadInitTeams() {
  const rawTeams = await db.eventTeam.findMany({
    where: { eventId: SYRENY_LITE_EVENT_ID, withdrawnAt: null },
    orderBy: { addedAt: "asc" },
    select: {
      id: true,
      teamChgkId: true,
      teamName: true,
      displayName: true,
      manualEntry: true,
    },
  });

  const teams = rawTeams.filter(
    (t) =>
      !SYRENY_LITE_HIDDEN_TEAM_NAMES.has(
        normalizeSyrenyLiteName(t.displayName ?? t.teamName),
      ),
  );

  const realIds = teams
    .filter((t) => !t.manualEntry && t.teamChgkId > 0)
    .map((t) => t.teamChgkId);
  const { map: ratings } = await fetchChgkGgRatings(realIds);

  const main: { id: string; name: string; outOfCompetition: boolean; pos: number | null }[] = [];
  const ooc: typeof main = [];

  for (const t of teams) {
    const name = applySyrenyLiteDisplayName(t.displayName ?? t.teamName);
    const r = !t.manualEntry && t.teamChgkId > 0 ? ratings.get(t.teamChgkId) : null;
    const pos = r?.position ?? null;
    const entry = { id: t.id, name, outOfCompetition: isOutOfCompetition(pos), pos };
    if (entry.outOfCompetition) ooc.push(entry);
    else main.push(entry);
  }

  main.sort((a, b) => {
    const pa = a.pos ?? 9999;
    const pb = b.pos ?? 9999;
    return pa - pb;
  });

  return [...main, ...ooc].map(({ id, name, outOfCompetition }) => ({
    id,
    name,
    outOfCompetition,
  }));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!canModerate(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const action = (body.action ?? "") as string;

  if (action === "init") {
    const teams = await loadInitTeams();
    if (teams.length === 0) {
      return NextResponse.json({ error: "Нет зарегистрированных команд" }, { status: 400 });
    }
    initBrainTournament(teams);
    return NextResponse.json({ ok: true });
  }

  if (action === "reset") {
    if (role !== "ADMIN" && role !== "ORGANIZER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    resetBrainTournament();
    return NextResponse.json({ ok: true });
  }

  if (action === "set-active-match") {
    const matchId = body.matchId ?? null;
    if (matchId !== null && typeof matchId !== "string") {
      return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
    }
    if (!setActiveMatch(matchId)) {
      return NextResponse.json({ error: "Match not found" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "set-capture") {
    const matchId = body.matchId as string;
    const questionIndex = body.questionIndex as number;
    const teamId = body.teamId === undefined ? null : (body.teamId as string | null);
    if (!matchId || typeof questionIndex !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!setCapture(matchId, questionIndex, teamId)) {
      return NextResponse.json({ error: "Failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "set-playoff-teams") {
    const matchId = body.matchId as string;
    const teamAId = body.teamAId as string;
    const teamBId = body.teamBId as string;
    if (!matchId || !teamAId || !teamBId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!setPlayoffTeams(matchId, teamAId, teamBId)) {
      return NextResponse.json({ error: "Failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "advance-playoff") {
    if (!advancePlayoffFromGroups()) {
      return NextResponse.json({ error: "Не удалось заполнить полуфиналы" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
