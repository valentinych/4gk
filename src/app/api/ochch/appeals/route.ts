import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OCHCH_EVENT_ID, resolveOchchSubmitTeamChgkId } from "@/lib/ochch";
import {
  OCHCH_APPEAL_ADMIN_RATIONALE_REQUIRED,
  OCHCH_APPEAL_ARGUMENTATION_REQUIRED,
  OCHCH_APPEAL_LOCKED,
  OCHCH_APPEAL_LOCK_PENDING,
  OCHCH_APPEAL_NO_ID,
  OCHCH_APPEAL_NOT_IN_ROSTER,
  OCHCH_APPEAL_UNLOCK_FORBIDDEN,
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

async function requirePageAdmin(): Promise<
  { ok: true; chgkId: number } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }),
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { chgkId: true, role: true },
  });
  if (!user?.chgkId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }),
    };
  }
  const isAdmin = await isOchchAppealPageAdmin(user.role, user.chgkId);
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }),
    };
  }
  return { ok: true, chgkId: user.chgkId };
}

async function parseJsonBody(
  req: Request,
): Promise<
  { ok: true; raw: Record<string, unknown> } | { ok: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return { ok: true, raw };
}

async function hardDeleteAppeal(id: string) {
  const existing = await db.ochchAppeal.findFirst({
    where: { id, eventId: OCHCH_EVENT_ID },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.ochchAppeal.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true, id: existing.id, deleted: true });
}

export async function PATCH(req: Request) {
  const admin = await requirePageAdmin();
  if (!admin.ok) return admin.response;
  const user = { chgkId: admin.chgkId };

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const raw = parsed.raw;
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const action = typeof raw.action === "string" ? raw.action : null;
  if (action === "unlock" || raw.locked === false) {
    return NextResponse.json(
      { error: OCHCH_APPEAL_UNLOCK_FORBIDDEN },
      { status: 409 },
    );
  }
  if (action === "hardDelete") {
    return hardDeleteAppeal(id);
  }
  if (action != null && action !== "lock" && action !== "trash") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const existing = await db.ochchAppeal.findFirst({
    where: { id, eventId: OCHCH_EVENT_ID },
    select: {
      id: true,
      status: true,
      adminRationale: true,
      locked: true,
      trashed: true,
      decidedByChgkId: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "trash") {
    const row = existing.trashed
      ? existing
      : await db.ochchAppeal.update({
          where: { id: existing.id },
          data: { trashed: true },
        });
    return NextResponse.json({ ok: true, id: row.id, trashed: true });
  }

  if (action === "lock") {
    if (!existing.locked && existing.status === "PENDING") {
      return NextResponse.json(
        { error: OCHCH_APPEAL_LOCK_PENDING },
        { status: 409 },
      );
    }
    const row = existing.locked
      ? existing
      : await db.ochchAppeal.update({
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
      adminRationale: row.adminRationale,
      locked: true,
      decidedByName,
    });
  }

  const hasStatus = Object.prototype.hasOwnProperty.call(raw, "status");
  const hasRationale = Object.prototype.hasOwnProperty.call(raw, "adminRationale");
  if (!hasStatus && !hasRationale) {
    return NextResponse.json(
      { error: "status or adminRationale is required" },
      { status: 400 },
    );
  }

  if (existing.locked) {
    return NextResponse.json(
      { error: OCHCH_APPEAL_LOCKED },
      { status: 409 },
    );
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
      locked: false,
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
    locked: row.locked,
    decidedByChgkId: row.decidedByChgkId,
    decidedByName,
  });
}

export async function DELETE(req: Request) {
  const admin = await requirePageAdmin();
  if (!admin.ok) return admin.response;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const id = typeof parsed.raw.id === "string" ? parsed.raw.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  return hardDeleteAppeal(id);
}
