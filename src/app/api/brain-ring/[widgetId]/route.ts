import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { brainRingAccess, requireModerator } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import {
  emptyCaptures,
  matchesFromScheme,
  parseCaptures,
  parseHostIds,
  parseMatchStatus,
  parseScheme,
  parseTeamIdsFromScores,
  playoffSlots,
  publicGroups,
  resetFilledSlots,
  resolvePlayoffSource,
  schemeWithHostIds,
  scoresToJson,
  toMatchDto,
  lotteryOrderFromRows,
  roundRobinMatches,
  sopotCombinedStandings,
  sopotFillFinal,
  sopotFillStage2,
  sopotGroupStandings,
  sopotStage1Groups,
  sopotStage2Groups,
  tiedClusters,
  type BrainCapture,
  type BrainRingMatchDto,
  type BrainRingPlayoffSlot,
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

async function loadHosts(hostIds: string[]) {
  if (hostIds.length === 0) return [];
  const users = await db.user.findMany({
    where: { id: { in: hostIds } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return hostIds.flatMap((id) => {
    const u = byId.get(id);
    return u ? [u] : [];
  });
}

function emptyPayload(
  widget: { id: string; title: string; path: string },
  session: Session | null,
  hostIds: string[] = [],
) {
  const access = brainRingAccess(session?.user?.role, hostIds, session?.user?.id);
  return {
    widgetId: widget.id,
    title: widget.title,
    path: widget.path,
    ...access,
    canModerate: access.canScore || access.canEditScheme,
    hosts: [] as Awaited<ReturnType<typeof loadHosts>>,
    event: null,
  };
}

async function eventPayload(widgetId: string, session: Session | null) {
  const widget = await loadWidget(widgetId);
  if (!widget) return null;

  const event = await db.brainRingEvent.findUnique({
    where: { widgetId },
    include: { matches: { orderBy: { playOrder: "asc" } } },
  }).catch((e) => {
    if (isPrismaMissingTable(e)) return null;
    throw e;
  });
  if (!event) return emptyPayload(widget, session);

  const hostIds = parseHostIds(event.scheme);
  const access = brainRingAccess(session?.user?.role, hostIds, session?.user?.id);
  const hosts = await loadHosts(hostIds);

  const scheme = parseScheme(event.scheme);
  if ("error" in scheme) {
    return { ...emptyPayload(widget, session, hostIds), hosts: access.canAssignHosts ? hosts : [] };
  }

  const matches = matchDtos(scheme, event.matches);
  const groups = publicGroups(scheme, matches);
  const finals = matches.filter((m) => m.kind === "finals" || m.kind === "bracket");
  const live = matches.find((m) => m.active) ?? null;

  return {
    widgetId,
    title: widget.title,
    path: widget.path,
    ...access,
    canModerate: access.canScore || access.canEditScheme,
    hosts: access.canAssignHosts ? hosts : [],
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
    const payload = await eventPayload(widgetId, session);
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
    await db.$transaction(async (tx) => {
      const existing = await tx.brainRingEvent.findUnique({
        where: { widgetId },
        select: { id: true, scheme: true },
      });
      const hostIds = existing ? parseHostIds(existing.scheme) : [];
      const schemeJson = schemeWithHostIds(scheme, hostIds);
      if (existing) {
        await tx.brainRingMatch.deleteMany({ where: { eventId: existing.id } });
        await tx.brainRingEvent.update({
          where: { id: existing.id },
          data: {
            template: scheme.preset,
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
            scores: scoresToJson(r.scores.captures, r.teamIds),
            active: false,
          })),
        });
      } else {
        await tx.brainRingEvent.create({
          data: {
            widgetId,
            template: scheme.preset,
            questionCount: scheme.questionCount,
            scheme: schemeWithHostIds(scheme, []),
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
                scores: scoresToJson(r.scores.captures, r.teamIds),
                active: false,
              })),
            },
          },
        });
      }
    });

    const session = await getServerSession(authOptions);
    const payload = await eventPayload(widgetId, session);
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    const hostIds = parseHostIds(event.scheme);
    const access = brainRingAccess(session.user.role, hostIds, session.user.id);
    if (action === "add-host" || action === "remove-host") {
      if (!access.canAssignHosts) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (action === "reset-results") {
      if (!access.canReset) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (!access.canScore) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const scheme = parseScheme(event.scheme);
    if ("error" in scheme) {
      return NextResponse.json({ error: scheme.error }, { status: 400 });
    }

    const dtos = matchDtos(scheme, event.matches);

    if (action === "add-host") {
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (!userId) return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
      const found = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!found) return NextResponse.json({ error: "Пользователь не найден" }, { status: 400 });
      const next = hostIds.includes(userId) ? hostIds : [...hostIds, userId];
      await db.brainRingEvent.update({
        where: { id: event.id },
        data: { scheme: schemeWithHostIds(scheme, next) },
      });
    } else if (action === "remove-host") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      await db.brainRingEvent.update({
        where: { id: event.id },
        data: { scheme: schemeWithHostIds(scheme, hostIds.filter((id) => id !== userId)) },
      });
    } else if (action === "start-match") {
      const matchId = typeof body.matchId === "string" ? body.matchId : "";
      const match = event.matches.find((m) => m.id === matchId);
      if (!match) return NextResponse.json({ error: "Некорректный матч" }, { status: 400 });
      const teamIds = parseTeamIdsFromScores(match.scores, match.teamAId, match.teamBId);
      if (teamIds.length < 2) {
        return NextResponse.json({ error: "Сначала назначьте команды" }, { status: 400 });
      }
      const status = parseMatchStatus(match.scores, match.active, match.questionCount);
      if (status === "finished") {
        return NextResponse.json({ error: "Бой уже завершён" }, { status: 400 });
      }
      const captures = parseCaptures((match.scores as { captures?: unknown })?.captures, match.questionCount);
      await db.$transaction([
        db.brainRingMatch.updateMany({
          where: { eventId: event.id, sectionId: match.sectionId },
          data: { active: false },
        }),
        db.brainRingMatch.update({
          where: { id: match.id },
          data: { scores: scoresToJson(captures, teamIds, "started"), active: true },
        }),
      ]);
    } else if (action === "finish-match") {
      const matchId = typeof body.matchId === "string" ? body.matchId : "";
      const match = event.matches.find((m) => m.id === matchId);
      if (!match) return NextResponse.json({ error: "Некорректный матч" }, { status: 400 });
      const status = parseMatchStatus(match.scores, match.active, match.questionCount);
      if (status !== "started") {
        return NextResponse.json({ error: "Сначала начните бой" }, { status: 400 });
      }
      const teamIds = parseTeamIdsFromScores(match.scores, match.teamAId, match.teamBId);
      const captures = parseCaptures((match.scores as { captures?: unknown })?.captures, match.questionCount);
      await db.brainRingMatch.update({
        where: { id: match.id },
        data: { scores: scoresToJson(captures, teamIds, "finished"), active: false },
      });
    } else if (action === "reset-results") {
      const nextScheme = resetFilledSlots(scheme);
      const rows = matchesFromScheme(nextScheme);
      const rowBySlot = new Map(rows.map((r) => [r.slotId, r]));
      await db.$transaction(async (tx) => {
        await tx.brainRingEvent.update({
          where: { id: event.id },
          data: { scheme: schemeWithHostIds(nextScheme, hostIds) },
        });
        for (const match of event.matches) {
          const row = rowBySlot.get(match.slotId);
          const teamIds = row?.teamIds ?? [];
          const q = row?.questionCount ?? match.questionCount;
          await tx.brainRingMatch.update({
            where: { id: match.id },
            data: {
              teamAId: row?.teamAId ?? "",
              teamBId: row?.teamBId ?? "",
              questionCount: q,
              scores: scoresToJson(emptyCaptures(q), teamIds),
              active: false,
            },
          });
        }
      });
    } else if (action === "set-capture") {
      const matchId = typeof body.matchId === "string" ? body.matchId : "";
      const questionIndex =
        typeof body.questionIndex === "number" ? body.questionIndex : Number(body.questionIndex);
      const teamId = body.teamId === null || body.teamId === false ? false : String(body.teamId ?? "");
      const match = event.matches.find((m) => m.id === matchId);
      if (!match || !Number.isInteger(questionIndex)) {
        return NextResponse.json({ error: "Некорректный матч" }, { status: 400 });
      }
      const teamIds = parseTeamIdsFromScores(match.scores, match.teamAId, match.teamBId);
      const captures = parseCaptures(
        (match.scores as { captures?: unknown })?.captures,
        match.questionCount,
      );
      if (questionIndex < 0 || questionIndex >= captures.length) {
        return NextResponse.json({ error: "Некорректный вопрос" }, { status: 400 });
      }
      if (parseMatchStatus(match.scores, match.active, match.questionCount) !== "started") {
        return NextResponse.json({ error: "Сначала начните бой" }, { status: 400 });
      }
      const next: BrainCapture =
        typeof teamId === "string" && teamIds.includes(teamId)
          ? teamId === captures[questionIndex]
            ? false
            : teamId
          : false;
      captures[questionIndex] = next;
      await db.brainRingMatch.update({
        where: { id: match.id },
        data: { scores: scoresToJson(captures, teamIds, "started"), active: true },
      });
      await db.brainRingMatch.updateMany({
        where: { eventId: event.id, id: { not: match.id }, sectionId: match.sectionId },
        data: { active: false },
      });
    } else if (action === "set-active") {
      const matchId = typeof body.matchId === "string" ? body.matchId : "";
      const match = event.matches.find((m) => m.id === matchId);
      if (!match) return NextResponse.json({ error: "Некорректный матч" }, { status: 400 });
      if (parseMatchStatus(match.scores, match.active, match.questionCount) !== "started") {
        return NextResponse.json({ error: "Сначала начните бой" }, { status: 400 });
      }
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
      const teamIds = [teamAId, teamBId].filter(Boolean);
      await db.brainRingMatch.update({
        where: { id: match.id },
        data: {
          teamAId,
          teamBId,
          ...(teamsChanged
            ? { scores: scoresToJson(parseCaptures([], match.questionCount), teamIds) }
            : {}),
        },
      });
    } else if (action === "fill-bracket") {
      const slots = playoffSlots(scheme);
      if (slots.length === 0) {
        return NextResponse.json({ error: "Нет сетки" }, { status: 400 });
      }
      const updates: Array<{ id: string; teamAId: string; teamBId: string; teamIds: string[] }> = [];
      for (const slot of slots) {
        const match = event.matches.find((m) => m.slotId === slot.id);
        if (!match) continue;
        const a = resolvePlayoffSource(slot.teamA, scheme, dtos);
        const b = resolvePlayoffSource(slot.teamB, scheme, dtos);
        if (!a || !b) continue;
        updates.push({ id: match.id, teamAId: a, teamBId: b, teamIds: [a, b] });
      }
      if (updates.length === 0) {
        return NextResponse.json({ error: "Нечего заполнять — сыграйте предыдущие матчи" }, { status: 400 });
      }
      await db.$transaction(
        updates.map((u) => {
          const prev = event.matches.find((m) => m.id === u.id);
          const changed = !prev || prev.teamAId !== u.teamAId || prev.teamBId !== u.teamBId;
          return db.brainRingMatch.update({
            where: { id: u.id },
            data: {
              teamAId: u.teamAId,
              teamBId: u.teamBId,
              ...(changed
                ? { scores: scoresToJson(parseCaptures([], prev?.questionCount ?? 7), u.teamIds) }
                : {}),
            },
          });
        }),
      );
    } else if (action === "fill-semis" || action === "fill-finals") {
      const wantPlace = action === "fill-semis";
      const isPlace = (s: BrainRingPlayoffSlot) =>
        s.teamA.kind === "place" && s.teamB.kind === "place";
      const slots = playoffSlots(scheme).filter((s) => (wantPlace ? isPlace(s) : !isPlace(s)));
      if (slots.length === 0) {
        return NextResponse.json(
          { error: wantPlace ? "Нет полуфиналов" : "Нет финальных матчей" },
          { status: 400 },
        );
      }
      const updates: Array<{ id: string; teamAId: string; teamBId: string }> = [];
      for (const slot of slots) {
        const match = event.matches.find((m) => m.slotId === slot.id);
        if (!match) {
          return NextResponse.json({ error: `Нет матча ${slot.id}` }, { status: 400 });
        }
        const teamAId = resolvePlayoffSource(slot.teamA, scheme, dtos);
        const teamBId = resolvePlayoffSource(slot.teamB, scheme, dtos);
        if (!teamAId || !teamBId) {
          return NextResponse.json(
            {
              error: wantPlace
                ? "Нужны итоги групп по схеме этапа"
                : "Сначала сыграйте полуфиналы (нужна победа, не ничья)",
            },
            { status: 400 },
          );
        }
        updates.push({ id: match.id, teamAId, teamBId });
      }
      await db.$transaction(
        updates.map((u) =>
          db.brainRingMatch.update({
            where: { id: u.id },
            data: { teamAId: u.teamAId, teamBId: u.teamBId },
          }),
        ),
      );
    } else if (action === "fill-stage-2") {
      const stage1 = sopotStage1Groups(scheme);
      const plan = sopotFillStage2(scheme.teams, stage1, dtos);
      if ("error" in plan) {
        return NextResponse.json({ error: plan.error }, { status: 400 });
      }
      const nextScheme: BrainRingScheme = {
        ...scheme,
        stages: scheme.stages.map((st) => {
          if (st.id !== "stage2" || st.type !== "groups") return st;
          return {
            ...st,
            groups: st.groups.map((g) => {
              const found = plan.groups.find((x) => x.letter === g.letter);
              return found ? { ...g, teamIds: found.teamIds } : g;
            }),
          };
        }),
      };
      const matchUpdates: Array<{ id: string; teamIds: string[]; reset: boolean; questionCount: number }> = [];
      for (const g of plan.groups) {
        const pairs = roundRobinMatches(g.teamIds, 2);
        for (let i = 0; i < pairs.length; i++) {
          const match = event.matches.find((m) => m.slotId === `${g.letter}-${i + 1}`);
          if (!match) {
            return NextResponse.json({ error: `Нет матча ${g.letter}-${i + 1}` }, { status: 400 });
          }
          const ids = pairs[i]!;
          const prevIds = parseTeamIdsFromScores(match.scores, match.teamAId, match.teamBId);
          const reset = prevIds.join() !== ids.join();
          matchUpdates.push({ id: match.id, teamIds: ids, reset, questionCount: match.questionCount });
        }
      }
      await db.$transaction([
        db.brainRingEvent.update({
          where: { id: event.id },
          data: { scheme: schemeWithHostIds(nextScheme, hostIds) },
        }),
        ...matchUpdates.map((u) =>
          db.brainRingMatch.update({
            where: { id: u.id },
            data: {
              teamAId: u.teamIds[0] ?? "",
              teamBId: u.teamIds[1] ?? "",
              ...(u.reset ? { scores: scoresToJson(parseCaptures([], u.questionCount), u.teamIds) } : {}),
            },
          }),
        ),
      ]);
    } else if (action === "fill-final") {
      const plan = sopotFillFinal(
        scheme.teams,
        sopotStage1Groups(scheme),
        sopotStage2Groups(scheme),
        dtos,
        scheme.overallTieBreak ?? [],
      );
      if ("error" in plan) {
        return NextResponse.json({ error: plan.error }, { status: 400 });
      }
      const match = event.matches.find((m) => m.slotId === "final");
      if (!match) {
        return NextResponse.json({ error: "Нет финального матча" }, { status: 400 });
      }
      const nextScheme: BrainRingScheme = {
        ...scheme,
        stages: scheme.stages.map((st) => (st.id === "final" && st.type === "rr" ? { ...st, teamIds: plan.teamIds } : st)),
      };
      const prevIds = parseTeamIdsFromScores(match.scores, match.teamAId, match.teamBId);
      const reset = prevIds.join() !== plan.teamIds.join();
      await db.$transaction([
        db.brainRingEvent.update({
          where: { id: event.id },
          data: { scheme: schemeWithHostIds(nextScheme, hostIds) },
        }),
        db.brainRingMatch.update({
          where: { id: match.id },
          data: {
            teamAId: plan.teamIds[0] ?? "",
            teamBId: plan.teamIds[1] ?? "",
            ...(reset ? { scores: scoresToJson(parseCaptures([], match.questionCount), plan.teamIds) } : {}),
          },
        }),
      ]);
    } else if (action === "lottery-group") {
      const letter = typeof body.letter === "string" ? body.letter : "";
      const g = sopotStage1Groups(scheme).find((x) => x.letter === letter)
        ?? sopotStage2Groups(scheme).find((x) => x.letter === letter);
      if (!g) return NextResponse.json({ error: "Нет такой группы" }, { status: 400 });
      const rows = sopotGroupStandings(g, scheme.teams, dtos);
      if (tiedClusters(rows).length === 0) {
        return NextResponse.json({ error: "В группе нет ничьих для жеребьёвки" }, { status: 400 });
      }
      const tieBreak = lotteryOrderFromRows(rows);
      const nextScheme: BrainRingScheme = {
        ...scheme,
        stages: scheme.stages.map((st) => {
          if (st.type !== "groups") return st;
          return {
            ...st,
            groups: st.groups.map((gr) => (gr.letter === letter ? { ...gr, tieBreak } : gr)),
          };
        }),
      };
      await db.brainRingEvent.update({
        where: { id: event.id },
        data: { scheme: schemeWithHostIds(nextScheme, hostIds) },
      });
    } else if (action === "lottery-overall") {
      const rows = sopotCombinedStandings(
        scheme.teams,
        sopotStage1Groups(scheme),
        dtos,
        scheme.overallTieBreak ?? [],
      );
      if (tiedClusters(rows).length === 0) {
        return NextResponse.json({ error: "В общей таблице нет ничьих для жеребьёвки" }, { status: 400 });
      }
      const nextScheme: BrainRingScheme = { ...scheme, overallTieBreak: lotteryOrderFromRows(rows) };
      await db.brainRingEvent.update({
        where: { id: event.id },
        data: { scheme: schemeWithHostIds(nextScheme, hostIds) },
      });
    } else {
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
    }

    const payload = await eventPayload(widgetId, session);
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
