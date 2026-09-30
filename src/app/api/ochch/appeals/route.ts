import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OCHCH_EVENT_ID, resolveOchchSubmitTeamChgkId } from "@/lib/ochch";
import {
  OCHCH_APPEAL_ADMIN_RATIONALE_REQUIRED,
  OCHCH_APPEAL_ARGUMENTATION_REQUIRED,
  OCHCH_APPEAL_NO_ID,
  OCHCH_APPEAL_NOT_IN_ROSTER,
  isOchchAppealPageAdmin,
  isValidQuestionNumber,
  parseAppealKind,
  parseAppealVerdict,
  parseQuestionNumber,
  ratingPlayerDisplayName,
  requiresAdminRationale,
  resolveOchchAppealAccess,
} from "@/lib/ochch-appeals";

export const dynamic = "force-dynamic";

function accessError(reason: "no-id" | "not-in-roster") {
  const message =
    reason === "no-id" ? OCHCH_APPEAL_NO_ID : OCHCH_APPEAL_NOT_IN_ROSTER;
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return accessError("no-id");
  }

  const access = await resolveOchchAppealAccess(session.user.id);
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

  const kind = parseAppealKind(raw.kind);
  if (!kind) {
    return NextResponse.json({ error: "вид is required" }, { status: 400 });
  }

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

  const argumentation =
    typeof raw.argumentation === "string" ? raw.argumentation.trim() : "";
  if (!argumentation) {
    return NextResponse.json(
      { error: OCHCH_APPEAL_ARGUMENTATION_REQUIRED },
      { status: 400 },
    );
  }

  const row = await db.ochchAppeal.create({
    data: {
      eventId: OCHCH_EVENT_ID,
      teamChgkId: team.teamChgkId,
      playerChgkId: access.playerChgkId,
      kind,
      questionNumber,
      answerText,
      argumentation,
    },
  });

  const persisted = await db.ochchAppeal.findUnique({
    where: { id: row.id },
    select: { id: true },
  });
  if (!persisted) {
    console.error("[ochch-appeals] create missing after write", row.id);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id, questionNumber, kind });
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
  const isAdmin = await isOchchAppealPageAdmin(user.role, user.chgkId);
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

  const hasStatus = Object.prototype.hasOwnProperty.call(raw, "status");
  const hasRationale = Object.prototype.hasOwnProperty.call(raw, "adminRationale");
  if (!hasStatus && !hasRationale) {
    return NextResponse.json(
      { error: "status or adminRationale is required" },
      { status: 400 },
    );
  }

  const existing = await db.ochchAppeal.findFirst({
    where: { id, eventId: OCHCH_EVENT_ID },
    select: { id: true, status: true, adminRationale: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: {
    status?: "PENDING" | "ACCEPTED" | "REJECTED";
    adminRationale?: string | null;
    decidedByChgkId: number;
    decidedAt: Date;
  } = {
    decidedByChgkId: user.chgkId,
    decidedAt: new Date(),
  };

  if (hasStatus) {
    const status = parseAppealVerdict(raw.status);
    if (!status) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    data.status = status;
  }

  if (hasRationale) {
    const text = typeof raw.adminRationale === "string" ? raw.adminRationale.trim() : "";
    data.adminRationale = text || null;
  }

  const nextStatus = data.status ?? existing.status;
  const nextRationale =
    data.adminRationale !== undefined
      ? data.adminRationale
      : existing.adminRationale;
  if (requiresAdminRationale(nextStatus) && !nextRationale?.trim()) {
    return NextResponse.json(
      { error: OCHCH_APPEAL_ADMIN_RATIONALE_REQUIRED },
      { status: 400 },
    );
  }

  if (hasStatus && existing.status === data.status && !hasRationale) {
    const decidedByName = await ratingPlayerDisplayName(user.chgkId);
    return NextResponse.json({
      ok: true,
      id: existing.id,
      status: existing.status,
      adminRationale: existing.adminRationale,
      decidedByName,
    });
  }

  const row = await db.ochchAppeal.update({
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
    adminRationale: row.adminRationale,
    decidedByChgkId: row.decidedByChgkId,
    decidedByName,
  });
}
