import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OCHB_EVENT_ID, resolveOchbSubmitTeamChgkId } from "@/lib/ochb";
import { canUnlockOchchDecision } from "@/lib/ochch-decision-unlock";
import {
  OCHB_CONTROVERSIAL_HARD_DELETE_FORBIDDEN,
  OCHB_CONTROVERSIAL_LOCKED,
  OCHB_CONTROVERSIAL_LOCK_PENDING,
  OCHB_CONTROVERSIAL_NO_ID,
  OCHB_CONTROVERSIAL_NOT_IN_ROSTER,
  OCHB_CONTROVERSIAL_UNLOCK_FORBIDDEN,
  isOchbControversialGraveyardMember,
  isValidQuestionNumber,
  parseQuestionNumber,
  parseVerdict,
  ratingPlayerDisplayName,
  resolveOchbControversialAccess,
  resolveOchbModerationScope,
} from "@/lib/ochb-controversial";
import {
  canModerateOchbQuestion,
  type OchbControversialQuestionScope,
} from "@/lib/ochb-tour-editors";

export const dynamic = "force-dynamic";

function accessError(reason: "no-id" | "not-in-roster") {
  const message =
    reason === "no-id"
      ? OCHB_CONTROVERSIAL_NO_ID
      : OCHB_CONTROVERSIAL_NOT_IN_ROSTER;
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return accessError("no-id");
  }

  const access = await resolveOchbControversialAccess(session.user.id);
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

  const questionNumber = parseQuestionNumber(raw.questionNumber);
  if (questionNumber == null || !isValidQuestionNumber(questionNumber)) {
    return NextResponse.json(
      { error: "номер вопроса must be an integer from 1 to 90" },
      { status: 400 },
    );
  }
  if (
    access.moderationScope?.kind === "range" &&
    !canModerateOchbQuestion(access.moderationScope, questionNumber)
  ) {
    return NextResponse.json(
      {
        error: `Можно отправить только вопросы ${access.moderationScope.from}–${access.moderationScope.to}`,
      },
      { status: 403 },
    );
  }

  const answerText =
    typeof raw.answerText === "string" ? raw.answerText.trim() : "";
  if (!answerText) {
    return NextResponse.json({ error: "текст ответа is required" }, { status: 400 });
  }

  const row = await db.ochbControversial.create({
    data: {
      eventId: OCHB_EVENT_ID,
      teamChgkId: team.teamChgkId,
      playerChgkId: access.playerChgkId,
      questionNumber,
      answerText,
    },
  });

  const persisted = await db.ochbControversial.findUnique({
    where: { id: row.id },
    select: { id: true },
  });
  if (!persisted) {
    console.error("[ochb-controversial] create missing after write", row.id);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id, questionNumber });
}

async function requirePageAdmin(): Promise<
  | {
      ok: true;
      chgkId: number | null;
      role: string;
      email: string | null;
      scope: OchbControversialQuestionScope;
    }
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
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }),
    };
  }
  const scope = await resolveOchbModerationScope(user.role, user.chgkId);
  if (!scope) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }),
    };
  }
  return {
    ok: true,
    chgkId: user.chgkId,
    role: user.role,
    email: user.email,
    scope,
  };
}

async function requireGraveyardMember(
  role: string,
  chgkId: number | null,
): Promise<NextResponse | null> {
  if (await isOchbControversialGraveyardMember(role, chgkId)) return null;
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

function hardDeleteForbidden() {
  return NextResponse.json(
    { error: OCHB_CONTROVERSIAL_HARD_DELETE_FORBIDDEN },
    { status: 409 },
  );
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
  if (action === "hardDelete") {
    return hardDeleteForbidden();
  }
  if (
    action != null &&
    action !== "lock" &&
    action !== "trash" &&
    action !== "unlock"
  ) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const existing = await db.ochbControversial.findFirst({
    where: { id, eventId: OCHB_EVENT_ID },
    select: {
      id: true,
      questionNumber: true,
      status: true,
      rationale: true,
      locked: true,
      trashed: true,
      decidedByChgkId: true,
    },
  });
  if (!existing) {
    if (
      (action === "unlock" || raw.locked === false) &&
      !canUnlockOchchDecision(admin.email)
    ) {
      return NextResponse.json(
        { error: OCHB_CONTROVERSIAL_UNLOCK_FORBIDDEN },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canModerateOchbQuestion(admin.scope, existing.questionNumber)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  if (action === "unlock" || raw.locked === false) {
    if (!canUnlockOchchDecision(admin.email)) {
      return NextResponse.json(
        { error: OCHB_CONTROVERSIAL_UNLOCK_FORBIDDEN },
        { status: 403 },
      );
    }
    const row = await db.ochbControversial.update({
      where: { id: existing.id },
      data: {
        locked: false,
        lockedAt: null,
        lockedByChgkId: null,
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
      locked: false,
      decidedByName,
    });
  }
  if (action === "trash") {
    const denied = await requireGraveyardMember(admin.role, user.chgkId);
    if (denied) return denied;
  }

  if (action === "trash") {
    const row = existing.trashed
      ? existing
      : await db.ochbControversial.update({
          where: { id: existing.id },
          data: { trashed: true },
        });
    return NextResponse.json({ ok: true, id: row.id, trashed: true });
  }

  if (action === "lock") {
    if (!existing.locked && existing.status === "PENDING") {
      return NextResponse.json(
        { error: OCHB_CONTROVERSIAL_LOCK_PENDING },
        { status: 409 },
      );
    }
    const row = existing.locked
      ? existing
      : await db.ochbControversial.update({
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
      { error: OCHB_CONTROVERSIAL_LOCKED },
      { status: 409 },
    );
  }

  const data: {
    status?: "PENDING" | "ACCEPTED" | "REJECTED";
    rationale?: string | null;
    decidedByChgkId: number | null;
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
    const decidedByName =
      user.chgkId != null ? await ratingPlayerDisplayName(user.chgkId) : null;
    return NextResponse.json({
      ok: true,
      id: existing.id,
      status: existing.status,
      rationale: existing.rationale,
      locked: false,
      decidedByName,
    });
  }

  const row = await db.ochbControversial.update({
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

export async function DELETE() {
  const admin = await requirePageAdmin();
  if (!admin.ok) return admin.response;
  return hardDeleteForbidden();
}
