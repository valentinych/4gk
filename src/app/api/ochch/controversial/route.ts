import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OCHCH_EVENT_ID, resolveOchchSubmitTeamChgkId } from "@/lib/ochch";
import {
  OCHCH_CONTROVERSIAL_LOCKED,
  OCHCH_CONTROVERSIAL_NO_ID,
  OCHCH_CONTROVERSIAL_NOT_IN_ROSTER,
  OCHCH_CONTROVERSIAL_UNLOCK_FORBIDDEN,
  isOchchControversialPageAdmin,
  isValidQuestionNumber,
  parseQuestionNumber,
  parseVerdict,
  ratingPlayerDisplayName,
  resolveOchchControversialAccess,
} from "@/lib/ochch-controversial";

export const dynamic = "force-dynamic";

function accessError(reason: "no-id" | "not-in-roster") {
  const message =
    reason === "no-id"
      ? OCHCH_CONTROVERSIAL_NO_ID
      : OCHCH_CONTROVERSIAL_NOT_IN_ROSTER;
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return accessError("no-id");
  }

  const access = await resolveOchchControversialAccess(session.user.id);
  if (!access.ok) return accessError(access.reason);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const team = resolveOchchSubmitTeamChgkId({
    isPageAdmin: access.isPageAdmin,
    rosterTeamChgkId: access.teamChgkId,
  });
  if (!team.ok) return accessError("not-in-roster");

  const questionNumber = parseQuestionNumber(raw.questionNumber);
  if (questionNumber == null || !isValidQuestionNumber(questionNumber)) {
    return NextResponse.json(
      { error: "номер вопроса must be an integer from 1 to 105" },
      { status: 400 },
    );
  }

  const answerText =
    typeof raw.answerText === "string" ? raw.answerText.trim() : "";
  if (!answerText) {
    return NextResponse.json({ error: "текст ответа is required" }, { status: 400 });
  }

  const row = await db.ochchControversial.create({
    data: {
      eventId: OCHCH_EVENT_ID,
      teamChgkId: team.teamChgkId,
      playerChgkId: access.playerChgkId,
      questionNumber,
      answerText,
    },
  });

  const persisted = await db.ochchControversial.findUnique({
    where: { id: row.id },
    select: { id: true },
  });
  if (!persisted) {
    console.error("[ochch-controversial] create missing after write", row.id);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id, questionNumber });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { chgkId: true, role: true },
  });
  if (!user?.chgkId) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const isAdmin = await isOchchControversialPageAdmin(user.role, user.chgkId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const action = typeof raw.action === "string" ? raw.action : null;
  if (action === "unlock" || raw.locked === false) {
    return NextResponse.json(
      { error: OCHCH_CONTROVERSIAL_UNLOCK_FORBIDDEN },
      { status: 409 },
    );
  }
  if (action != null && action !== "lock") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const existing = await db.ochchControversial.findFirst({
    where: { id, eventId: OCHCH_EVENT_ID },
    select: {
      id: true,
      status: true,
      rationale: true,
      locked: true,
      decidedByChgkId: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "lock") {
    const row = existing.locked
      ? existing
      : await db.ochchControversial.update({
          where: { id: existing.id },
          data: {
            locked: true,
            lockedAt: new Date(),
            lockedByChgkId: user.chgkId,
          },
        });
    const decidedByName =
      row.decidedByChgkId != null
        ? await ratingPlayerDisplayName(row.decidedByChgkId)
        : null;
    return NextResponse.json({
      ok: true,
      id: row.id,
      status: row.status,
      rationale: row.rationale,
      locked: true,
      decidedByName,
    });
  }

  const hasStatus = Object.prototype.hasOwnProperty.call(raw, "status");
  const hasRationale = Object.prototype.hasOwnProperty.call(raw, "rationale");
  if (!hasStatus && !hasRationale) {
    return NextResponse.json(
      { error: "status or rationale is required" },
      { status: 400 },
    );
  }

  if (existing.locked) {
    return NextResponse.json(
      { error: OCHCH_CONTROVERSIAL_LOCKED },
      { status: 409 },
    );
  }

  const data: {
    status?: "PENDING" | "ACCEPTED" | "REJECTED";
    rationale?: string | null;
    decidedByChgkId: number;
    decidedAt: Date;
  } = {
    decidedByChgkId: user.chgkId,
    decidedAt: new Date(),
  };

  if (hasStatus) {
    const status = parseVerdict(raw.status);
    if (!status) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    data.status = status;
  }

  if (hasRationale) {
    const text = typeof raw.rationale === "string" ? raw.rationale.trim() : "";
    data.rationale = text || null;
  }

  if (hasStatus && existing.status === data.status && !hasRationale) {
    const decidedByName = await ratingPlayerDisplayName(user.chgkId);
    return NextResponse.json({
      ok: true,
      id: existing.id,
      status: existing.status,
      rationale: existing.rationale,
      locked: false,
      decidedByName,
    });
  }

  const row = await db.ochchControversial.update({
    where: { id: existing.id },
    data,
  });

  const decidedByName =
    row.decidedByChgkId != null
      ? await ratingPlayerDisplayName(row.decidedByChgkId)
      : null;

  return NextResponse.json({
    ok: true,
    id: row.id,
    status: row.status,
    rationale: row.rationale,
    locked: row.locked,
    decidedByChgkId: row.decidedByChgkId,
    decidedByName,
  });
}
