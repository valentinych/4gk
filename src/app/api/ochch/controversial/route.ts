import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OCHCH_EVENT_ID } from "@/lib/ochch";
import {
  OCHCH_CONTROVERSIAL_NO_ID,
  OCHCH_CONTROVERSIAL_NOT_IN_ROSTER,
  isValidQuestionNumber,
  parseQuestionNumber,
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

  const row = await db.ochchControversial.upsert({
    where: {
      eventId_teamChgkId_questionNumber: {
        eventId: OCHCH_EVENT_ID,
        teamChgkId: access.teamChgkId,
        questionNumber,
      },
    },
    create: {
      eventId: OCHCH_EVENT_ID,
      teamChgkId: access.teamChgkId,
      playerChgkId: access.playerChgkId,
      questionNumber,
      answerText,
    },
    update: {
      answerText,
      playerChgkId: access.playerChgkId,
    },
  });

  return NextResponse.json({ ok: true, id: row.id, questionNumber });
}
