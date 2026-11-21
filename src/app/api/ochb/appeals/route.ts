import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OCHB_EVENT_ID, resolveOchbSubmitTeamChgkId } from "@/lib/ochb";
import { canUnlockOchchDecision } from "@/lib/ochch-decision-unlock";
import {
  OCHB_APPEAL_ADMIN_RATIONALE_REQUIRED,
  OCHB_APPEAL_ARGUMENTATION_REQUIRED,
  OCHB_APPEAL_LOCKED,
  OCHB_APPEAL_LOCK_PENDING,
  OCHB_APPEAL_NO_ID,
  OCHB_APPEAL_NOT_IN_ROSTER,
  OCHB_APPEAL_UNLOCK_FORBIDDEN,
  isOchbAppealGraveyardMember,
  isOchbAppealPageAdmin,
  isValidQuestionNumber,
  ochbAppealUnlockUpdate,
  parseAppealKind,
  parseAppealVerdict,
  parseQuestionNumber,
  ratingPlayerDisplayName,
  requiresAdminRationale,
  resolveOchbAppealAccess,
} from "@/lib/ochb-appeals";

export const dynamic = "force-dynamic";

function accessError(reason: "no-id" | "not-in-roster") {
  const message =
    reason === "no-id" ? OCHB_APPEAL_NO_ID : OCHB_APPEAL_NOT_IN_ROSTER;
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return accessError("no-id");
  }

  const access = await resolveOchbAppealAccess(session.user.id);
  if (!access.ok) return accessError(access.reason);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const team = resolveOchbSubmitTeamChgkId({
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
      { error: "номер вопроса must be an integer from 1 to 90" },
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
      { error: OCHB_APPEAL_ARGUMENTATION_REQUIRED },
      { status: 400 },
    );
  }

  const row = await db.ochbAppeal.create({
    data: {
      eventId: OCHB_EVENT_ID,
      teamChgkId: team.teamChgkId,
      playerChgkId: access.playerChgkId,
      kind,
      questionNumber,
      answerText,
      argumentation,
    },
  });

  const persisted = await db.ochbAppeal.findUnique({
    where: { id: row.id },
    select: { id: true },
  });
  if (!persisted) {
    console.error("[ochb-appeals] create missing after write", row.id);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id, questionNumber, kind });
}

async function requirePageAdmin(): Promise<
  | { ok: true; chgkId: number; role: string; email: string | null }
  | { ok: false; response: NextResponse }
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
    select: { chgkId: true, role: true, email: true },
  });
  if (!user?.chgkId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }),
    };
  }
  const isAdmin = await isOchbAppealPageAdmin(user.role, user.chgkId);
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }),
    };
  }
  return { ok: true, chgkId: user.chgkId, role: user.role, email: user.email };
}

async function requireGraveyardMember(
  role: string,
  chgkId: number,
): Promise<NextResponse | null> {
  if (await isOchbAppealGraveyardMember(role, chgkId)) return null;
  return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
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
  const existing = await db.ochbAppeal.findFirst({
    where: { id, eventId: OCHB_EVENT_ID },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.ochbAppeal.delete({ where: { id: existing.id } });
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
    if (!canUnlockOchchDecision(admin.email)) {
      return NextResponse.json(
        { error: OCHB_APPEAL_UNLOCK_FORBIDDEN },
        { status: 403 },
      );
    }
    const existing = await db.ochbAppeal.findFirst({
      where: { id, eventId: OCHB_EVENT_ID },
      select: { id: true, trashed: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const row = await db.ochbAppeal.update({
      where: { id: existing.id },
      data: ochbAppealUnlockUpdate(existing.trashed),
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
      locked: false,
      trashed: row.trashed,
      decidedByName,
    });
  }
  if (action === "hardDelete") {
    const denied = await requireGraveyardMember(admin.role, user.chgkId);
    if (denied) return denied;
    return hardDeleteAppeal(id);
  }
  if (action != null && action !== "lock" && action !== "trash") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }
  if (action === "trash") {
    const denied = await requireGraveyardMember(admin.role, user.chgkId);
    if (denied) return denied;
  }

  const existing = await db.ochbAppeal.findFirst({
    where: { id, eventId: OCHB_EVENT_ID },
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
    const comment = Object.prototype.hasOwnProperty.call(raw, "adminRationale")
      ? typeof raw.adminRationale === "string"
        ? raw.adminRationale.trim() || null
        : null
      : undefined;
    const nextRationale =
      comment !== undefined ? comment : existing.adminRationale;
    if (
      !existing.locked &&
      comment !== undefined &&
      requiresAdminRationale(existing.status) &&
      !nextRationale?.trim()
    ) {
      return NextResponse.json(
        { error: OCHB_APPEAL_ADMIN_RATIONALE_REQUIRED },
        { status: 400 },
      );
    }
    const row = await db.ochbAppeal.update({
      where: { id: existing.id },
      data: {
        trashed: true,
        ...(!existing.locked && comment !== undefined
          ? { adminRationale: comment }
          : {}),
      },
    });
    return NextResponse.json({
      ok: true,
      id: row.id,
      trashed: true,
      adminRationale: row.adminRationale,
    });
  }

  if (action === "lock") {
    if (!existing.locked && existing.status === "PENDING") {
      return NextResponse.json(
        { error: OCHB_APPEAL_LOCK_PENDING },
        { status: 409 },
      );
    }
    const comment = Object.prototype.hasOwnProperty.call(raw, "adminRationale")
      ? typeof raw.adminRationale === "string"
        ? raw.adminRationale.trim() || null
        : null
      : undefined;
    const nextRationale =
      comment !== undefined ? comment : existing.adminRationale;
    if (
      !existing.locked &&
      requiresAdminRationale(existing.status) &&
      !nextRationale?.trim()
    ) {
      return NextResponse.json(
        { error: OCHB_APPEAL_ADMIN_RATIONALE_REQUIRED },
        { status: 400 },
      );
    }
    const row = existing.locked
      ? existing
      : await db.ochbAppeal.update({
          where: { id: existing.id },
          data: {
            locked: true,
            lockedAt: new Date(),
            lockedByChgkId: user.chgkId,
            ...(comment !== undefined ? { adminRationale: comment } : {}),
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
      { error: OCHB_APPEAL_LOCKED },
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
      { error: OCHB_APPEAL_ADMIN_RATIONALE_REQUIRED },
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

  const row = await db.ochbAppeal.update({
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
  const denied = await requireGraveyardMember(admin.role, admin.chgkId);
  if (denied) return denied;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const id = typeof parsed.raw.id === "string" ? parsed.raw.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  return hardDeleteAppeal(id);
}
