import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { canRunBrainRing, requireModerator } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import {
  matchesFromScheme,
  parseScheme,
  parseCaptures,
  publicGroups,
  scoresToJson,
  teamIdAtPlace,
  toMatchDto,
  type BrainCapture,
  type BrainRingMatchDto,
  type BrainRingScheme,
} from "@/lib/brain-ring";
import { db } from "@/lib/db";
import { isPrismaMissingTable, PAGE_WIDGET_BRAIN } from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ widgetId: string }> };

async function loadWidget(widgetId: string) {
  const widget = await db.pageWidget.findUnique({ where: { id: widgetId } });
  if (!widget || widget.archived || widget.type !== PAGE_WIDGET_BRAIN) return null;
  return widget;
}

function matchDtos(
  scheme: BrainRingScheme,
  matches: Array<{
    id: string;
    slotId: string;
    sectionId: string;
    kind: string;
    round: string;
    venue: string;
    teamAId: string;
    teamBId: string;
    playOrder: number;
    questionCount: number;
    scores: unknown;
    active: boolean;
  }>,
): BrainRingMatchDto[] {
  const names: Record<string, string> = {};
  for (const t of scheme.teams) names[t.id] = t.name;
  return matches
    .slice()
    .sort((a, b) => a.playOrder - b.playOrder)
    .map((m) => toMatchDto(m, names));
}

async function eventPayload(widgetId: string, canModerate: boolean) {
  const widget = await loadWidget(widgetId);
  if (!widget) return null;

  const event = await db.brainRingEvent.findUnique({
    where: { widgetId },
    include: { matches: { orderBy: { playOrder: "asc" } } },
  }).catch((e) => {
    if (isPrismaMissingTable(e)) return null;
    throw e;
  });
  if (!event) {
    return {
      widgetId,
      title: widget.title,
      path: widget.path,
      canModerate,
      event: null,
    };
  }

  const scheme = parseScheme(event.scheme);
  if ("error" in scheme) {
    return {
      widgetId,
      title: widget.title,
      path: widget.path,
      canModerate,
      event: null,
    };
  }

  const matches = matchDtos(scheme, event.matches);
  const groups = publicGroups(scheme, matches);
  const finals = matches.filter((m) => m.kind === "finals");
  const live = matches.find((m) => m.active) ?? null;

  return {
    widgetId,
    title: widget.title,
    path: widget.path,
    canModerate,
    event: {
      id: event.id,
      template: event.template,
      questionCount: event.questionCount,
      scheme,
      groups,
      finals,
      matches,
      live,
      updatedAt: event.updatedAt.toISOString(),
    },
  };
}

export async function GET(_req: Request, { params }: Params) {
  const { widgetId } = await params;
  if (!widgetId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const session = await getServerSession(authOptions);
    const payload = await eventPayload(widgetId, canRunBrainRing(session?.user?.role));
    if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payload);
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("brain-ring get failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  const user = await requireModerator();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { widgetId } = await params;
  if (!widgetId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const scheme = parseScheme(rec.scheme ?? rec);
  if ("error" in scheme) {
    return NextResponse.json({ error: scheme.error }, { status: 400 });
  }

  try {
    const widget = await loadWidget(widgetId);
    if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rows = matchesFromScheme(scheme);
    const schemeJson = JSON.parse(JSON.stringify(scheme)) as Prisma.InputJsonValue;
    await db.$transaction(async (tx) => {
      const existing = await tx.brainRingEvent.findUnique({
        where: { widgetId },
        select: { id: true },
      });
      if (existing) {
        await tx.brainRingMatch.deleteMany({ where: { eventId: existing.id } });
        await tx.brainRingEvent.update({
          where: { id: existing.id },
          data: {
            template: scheme.template,
            questionCount: scheme.questionCount,
            scheme: schemeJson,
          },
        });
        await tx.brainRingMatch.createMany({
          data: rows.map((r) => ({
            eventId: existing.id,
            slotId: r.slotId,
            sectionId: r.sectionId,
            kind: r.kind,
            round: r.round,
            venue: r.venue,
            teamAId: r.teamAId,
            teamBId: r.teamBId,
            playOrder: r.playOrder,
            questionCount: r.questionCount,
            scores: scoresToJson(r.scores.captures),
            active: false,
          })),
        });
      } else {
        await tx.brainRingEvent.create({
          data: {
            widgetId,
            template: scheme.template,
            questionCount: scheme.questionCount,
            scheme: schemeJson,
            matches: {
              create: rows.map((r) => ({
                slotId: r.slotId,
                sectionId: r.sectionId,
                kind: r.kind,
                round: r.round,
                venue: r.venue,
                teamAId: r.teamAId,
                teamBId: r.teamBId,
                playOrder: r.playOrder,
                questionCount: r.questionCount,
                scores: scoresToJson(r.scores.captures),
                active: false,
              })),
            },
          },
        });
      }
    });

    const payload = await eventPayload(widgetId, true);
    return NextResponse.json(payload);
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json(
        { error: "Таблица BrainRing ещё не создана. Нужен prisma db push." },
        { status: 503 },
      );
    }
    console.error("brain-ring scheme save failed", e);
    return NextResponse.json({ error: "Не удалось сохранить схему" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const user = await requireModerator();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { widgetId } = await params;
  if (!widgetId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  try {
    const widget = await loadWidget(widgetId);
    if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const event = await db.brainRingEvent.findUnique({
      where: { widgetId },
      include: { matches: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Сначала сохраните схему турнира" }, { status: 400 });
    }

    const scheme = parseScheme(event.scheme);
    if ("error" in scheme) {
      return NextResponse.json({ error: scheme.error }, { status: 400 });
    }

    const dtos = matchDtos(scheme, event.matches);

    if (action === "set-capture") {
      const matchId = typeof body.matchId === "string" ? body.matchId : "";
      const questionIndex =
        typeof body.questionIndex === "number" ? body.questionIndex : Number(body.questionIndex);
      const teamId = body.teamId === null || body.teamId === false ? false : String(body.teamId ?? "");
      const match = event.matches.find((m) => m.id === matchId);
      if (!match || !Number.isInteger(questionIndex)) {
        return NextResponse.json({ error: "Некорректный матч" }, { status: 400 });
      }
      const captures = parseCaptures(
        (match.scores as { captures?: unknown })?.captures,
        match.questionCount,
      );
      if (questionIndex < 0 || questionIndex >= captures.length) {
        return NextResponse.json({ error: "Некорректный вопрос" }, { status: 400 });
      }
      const next: BrainCapture =
        typeof teamId === "string" && (teamId === match.teamAId || teamId === match.teamBId)
          ? teamId === captures[questionIndex]
            ? false
            : teamId
          : false;
      captures[questionIndex] = next;
      await db.brainRingMatch.update({
        where: { id: match.id },
        data: { scores: scoresToJson(captures), active: true },
      });
      await db.brainRingMatch.updateMany({
        where: { eventId: event.id, id: { not: match.id }, sectionId: match.sectionId },
        data: { active: false },
      });
    } else if (action === "set-active") {
      const matchId = typeof body.matchId === "string" ? body.matchId : "";
      const match = event.matches.find((m) => m.id === matchId);
      if (!match) return NextResponse.json({ error: "Некорректный матч" }, { status: 400 });
      await db.$transaction([
        db.brainRingMatch.updateMany({
          where: { eventId: event.id, sectionId: match.sectionId },
          data: { active: false },
        }),
        db.brainRingMatch.update({ where: { id: match.id }, data: { active: true } }),
      ]);
    } else if (action === "clear-active") {
      const sectionId = typeof body.sectionId === "string" ? body.sectionId : "";
      await db.brainRingMatch.updateMany({
        where: sectionId ? { eventId: event.id, sectionId } : { eventId: event.id },
        data: { active: false },
      });
    } else if (action === "set-playoff-teams") {
      const matchId = typeof body.matchId === "string" ? body.matchId : "";
      const teamAId = typeof body.teamAId === "string" ? body.teamAId : "";
      const teamBId = typeof body.teamBId === "string" ? body.teamBId : "";
      const match = event.matches.find((m) => m.id === matchId);
      if (!match || match.kind !== "finals") {
        return NextResponse.json({ error: "Некорректный матч" }, { status: 400 });
      }
      const known = new Set(scheme.teams.map((t) => t.id));
      if ((teamAId && !known.has(teamAId)) || (teamBId && !known.has(teamBId))) {
        return NextResponse.json({ error: "Неизвестная команда" }, { status: 400 });
      }
      const teamsChanged = match.teamAId !== teamAId || match.teamBId !== teamBId;
      await db.brainRingMatch.update({
        where: { id: match.id },
        data: {
          teamAId,
          teamBId,
          ...(teamsChanged
            ? { scores: scoresToJson(parseCaptures([], match.questionCount)) }
            : {}),
        },
      });
    } else if (action === "fill-semis") {
      const a1 = teamIdAtPlace(scheme, dtos, "A", 1);
      const b1 = teamIdAtPlace(scheme, dtos, "B", 1);
      const c1 = teamIdAtPlace(scheme, dtos, "C", 1);
      const d1 = teamIdAtPlace(scheme, dtos, "D", 1);
      const sf1 = event.matches.find((m) => m.slotId === "sf1");
      const sf2 = event.matches.find((m) => m.slotId === "sf2");
      if (!sf1 || !sf2) {
        return NextResponse.json({ error: "Нет полуфиналов" }, { status: 400 });
      }
      let pair1: [string, string] | null = null;
      let pair2: [string, string] | null = null;
      if (a1 && b1 && c1 && d1) {
        pair1 = [a1, d1];
        pair2 = [b1, c1];
      } else {
        const a2 = teamIdAtPlace(scheme, dtos, "A", 2);
        const b2 = teamIdAtPlace(scheme, dtos, "B", 2);
        if (a1 && a2 && b1 && b2) {
          pair1 = [a1, b2];
          pair2 = [b1, a2];
        }
      }
      if (!pair1 || !pair2) {
        return NextResponse.json(
          { error: "Нужны итоги групп: 1 места A–D или 1–2 места A и B" },
          { status: 400 },
        );
      }
      await db.$transaction([
        db.brainRingMatch.update({
          where: { id: sf1.id },
          data: { teamAId: pair1[0], teamBId: pair1[1] },
        }),
        db.brainRingMatch.update({
          where: { id: sf2.id },
          data: { teamAId: pair2[0], teamBId: pair2[1] },
        }),
      ]);
    } else if (action === "fill-finals") {
      const sf1 = dtos.find((m) => m.slotId === "sf1");
      const sf2 = dtos.find((m) => m.slotId === "sf2");
      if (!sf1?.complete || !sf2?.complete) {
        return NextResponse.json({ error: "Сначала сыграйте оба полуфинала" }, { status: 400 });
      }
      const winner = (m: BrainRingMatchDto) =>
        m.scoreA === m.scoreB ? "" : m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
      const loser = (m: BrainRingMatchDto) =>
        m.scoreA === m.scoreB ? "" : m.scoreA > m.scoreB ? m.teamBId : m.teamAId;
      const w1 = winner(sf1);
      const w2 = winner(sf2);
      const l1 = loser(sf1);
      const l2 = loser(sf2);
      if (!w1 || !w2 || !l1 || !l2) {
        return NextResponse.json({ error: "В полуфиналах нужна победа, не ничья" }, { status: 400 });
      }
      const third = event.matches.find((m) => m.slotId === "third");
      const fin = event.matches.find((m) => m.slotId === "final");
      if (!third || !fin) {
        return NextResponse.json({ error: "Нет финальных матчей" }, { status: 400 });
      }
      await db.$transaction([
        db.brainRingMatch.update({
          where: { id: third.id },
          data: { teamAId: l1, teamBId: l2 },
        }),
        db.brainRingMatch.update({
          where: { id: fin.id },
          data: { teamAId: w1, teamBId: w2 },
        }),
      ]);
    } else {
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
    }

    const payload = await eventPayload(widgetId, true);
    return NextResponse.json(payload);
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json(
        { error: "Таблица BrainRing ещё не создана. Нужен prisma db push." },
        { status: 503 },
      );
    }
    console.error("brain-ring action failed", e);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
