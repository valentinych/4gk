import { db } from "./db";
import { OCHCH_EVENT_ID } from "./ochch";

export const OCHCH_CONTROVERSIAL_NO_ID =
  "Привяжите свой ID на странице https://4gk.pl/account";

export const OCHCH_CONTROVERSIAL_NOT_IN_ROSTER =
  "Состав вашей команды не подан либо вы не находитесь в поданном составе вашей команды. Подать состав можно здесь: https://4gk.pl/ochch/roster";

export const OCHCH_CONTROVERSIAL_QUESTION_MIN = 1;
export const OCHCH_CONTROVERSIAL_QUESTION_MAX = 105;

export type OchchControversialAccess =
  | { ok: true; playerChgkId: number; teamChgkId: number }
  | { ok: false; reason: "no-id" | "not-in-roster" };

/** Server-side: linked rating ID first, then player on a submitted ochch-2026 roster. */
export async function resolveOchchControversialAccess(
  userId: string,
): Promise<OchchControversialAccess> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { chgkId: true },
  });
  if (!user?.chgkId) return { ok: false, reason: "no-id" };

  const roster = await db.teamRoster.findFirst({
    where: {
      eventId: OCHCH_EVENT_ID,
      teamChgkId: { not: null },
      players: { some: { chgkId: user.chgkId } },
    },
    select: { teamChgkId: true },
  });
  if (!roster?.teamChgkId) return { ok: false, reason: "not-in-roster" };

  return {
    ok: true,
    playerChgkId: user.chgkId,
    teamChgkId: roster.teamChgkId,
  };
}

export function parseQuestionNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return parseInt(value.trim(), 10);
  }
  return null;
}

export function isValidQuestionNumber(n: number): boolean {
  return (
    n >= OCHCH_CONTROVERSIAL_QUESTION_MIN &&
    n <= OCHCH_CONTROVERSIAL_QUESTION_MAX
  );
}
