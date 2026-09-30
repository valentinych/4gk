import { db } from "./db";
import { OCHCH_ADMIN_TEAM_CHGK_ID, OCHCH_EVENT_ID } from "./ochch";
import {
  getOchchStaffIds,
  isOchchSiteAdmin,
  ochchSlotNumber,
  ratingPlayerDisplayName,
  ratingPlayerDisplayNames,
} from "./ochch-rating-staff";

export { ochchSlotNumber, ratingPlayerDisplayName };

export const OCHCH_CONTROVERSIAL_NO_ID =
  "Привяжите свой ID на странице https://4gk.pl/account";

export const OCHCH_CONTROVERSIAL_NOT_IN_ROSTER =
  "Состав вашей команды не подан либо вы не находитесь в поданном составе вашей команды. Подать состав можно здесь: https://4gk.pl/ochch/roster";

export const OCHCH_CONTROVERSIAL_QUESTION_MIN = 1;
export const OCHCH_CONTROVERSIAL_QUESTION_MAX = 105;

export type OchchControversialVerdict = "PENDING" | "ACCEPTED" | "REJECTED";

const VERDICTS = new Set<OchchControversialVerdict>([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
]);

export function parseVerdict(value: unknown): OchchControversialVerdict | null {
  if (typeof value !== "string") return null;
  return VERDICTS.has(value as OchchControversialVerdict)
    ? (value as OchchControversialVerdict)
    : null;
}

export type OchchControversialAccess =
  | {
      ok: true;
      playerChgkId: number;
      teamChgkId: number | null;
      isPageAdmin: boolean;
    }
  | { ok: false; reason: "no-id" | "not-in-roster" };

export type OchchControversialPageAccess =
  | { gate: "no-id" }
  | { gate: "not-in-roster" }
  | {
      gate: "ok";
      chgkId: number;
      isPageAdmin: boolean;
      canSubmit: boolean;
      teamChgkId: number | null;
    };

export type OchchControversialMineItem = {
  id: string;
  questionNumber: number;
  answerText: string;
  status: OchchControversialVerdict;
  rationale: string | null;
};

export type OchchControversialAdminItem = OchchControversialMineItem & {
  teamNumber: number | null;
  decidedByName: string | null;
};

/** Server-side: linked rating ID first, then player on a submitted ochch-2026 roster. */
export async function resolveOchchControversialAccess(
  userId: string,
): Promise<OchchControversialAccess> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { chgkId: true, role: true },
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
  const teamChgkId = roster?.teamChgkId ?? null;
  const isPageAdmin = await isOchchControversialPageAdmin(user.role, user.chgkId);
  if (!teamChgkId && !isPageAdmin) return { ok: false, reason: "not-in-roster" };

  return {
    ok: true,
    playerChgkId: user.chgkId,
    teamChgkId,
    isPageAdmin,
  };
}

export async function resolveOchchControversialPageAccess(
  userId: string,
): Promise<OchchControversialPageAccess> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { chgkId: true, role: true },
  });
  if (!user?.chgkId) return { gate: "no-id" };

  const roster = await db.teamRoster.findFirst({
    where: {
      eventId: OCHCH_EVENT_ID,
      teamChgkId: { not: null },
      players: { some: { chgkId: user.chgkId } },
    },
    select: { teamChgkId: true },
  });
  const teamChgkId = roster?.teamChgkId ?? null;
  const isPageAdmin = await isOchchControversialPageAdmin(user.role, user.chgkId);
  if (!teamChgkId && !isPageAdmin) return { gate: "not-in-roster" };

  return {
    gate: "ok",
    chgkId: user.chgkId,
    isPageAdmin,
    canSubmit: isPageAdmin || teamChgkId != null,
    teamChgkId,
  };
}

/** Спорные staff: orgcommittee + editors + gameJury. Not appealJury. */
export async function getOchchControversialStaffIds(): Promise<Set<number> | null> {
  return getOchchStaffIds(["orgcommittee", "editors", "gameJury"]);
}

export async function isOchchControversialPageAdmin(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<boolean> {
  if (isOchchSiteAdmin(role)) return true;
  if (chgkId == null) return false;
  const ids = await getOchchControversialStaffIds();
  return ids?.has(chgkId) ?? false;
}

function trimRationale(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function mapControversialMine(
  rows: {
    id: string;
    questionNumber: number;
    answerText: string;
    status: OchchControversialVerdict;
    rationale: string | null;
  }[],
): OchchControversialMineItem[] {
  return rows.map((r) => ({
    id: r.id,
    questionNumber: r.questionNumber,
    answerText: r.answerText,
    status: r.status,
    rationale: trimRationale(r.rationale),
  }));
}

export async function loadOchchControversialMine(
  teamChgkId: number,
): Promise<OchchControversialMineItem[]> {
  const rows = await db.ochchControversial.findMany({
    where: { eventId: OCHCH_EVENT_ID, teamChgkId },
    orderBy: { questionNumber: "asc" },
    select: {
      id: true,
      questionNumber: true,
      answerText: true,
      status: true,
      rationale: true,
    },
  });
  return mapControversialMine(rows);
}

export async function loadOchchControversialMineByPlayer(
  playerChgkId: number,
): Promise<OchchControversialMineItem[]> {
  const rows = await db.ochchControversial.findMany({
    where: {
      eventId: OCHCH_EVENT_ID,
      playerChgkId,
      teamChgkId: OCHCH_ADMIN_TEAM_CHGK_ID,
    },
    orderBy: { questionNumber: "asc" },
    select: {
      id: true,
      questionNumber: true,
      answerText: true,
      status: true,
      rationale: true,
    },
  });
  return mapControversialMine(rows);
}

export async function loadOchchControversialAdmin(): Promise<
  OchchControversialAdminItem[]
> {
  const rows = await db.ochchControversial.findMany({
    where: { eventId: OCHCH_EVENT_ID },
    orderBy: [{ questionNumber: "asc" }, { teamChgkId: "asc" }],
  });
  const names = await ratingPlayerDisplayNames(
    rows
      .map((r) => r.decidedByChgkId)
      .filter((id): id is number => id != null),
  );
  return rows.map((r) => ({
    id: r.id,
    questionNumber: r.questionNumber,
    answerText: r.answerText,
    status: r.status,
    rationale: trimRationale(r.rationale),
    teamNumber: ochchSlotNumber(r.teamChgkId),
    decidedByName:
      r.decidedByChgkId != null ? (names.get(r.decidedByChgkId) ?? null) : null,
  }));
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
