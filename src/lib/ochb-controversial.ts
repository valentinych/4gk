import { db } from "./db";
import { OCHB_ADMIN_TEAM_CHGK_ID, OCHB_EVENT_ID } from "./ochb";
import { canUnlockOchchDecision } from "./ochch-decision-unlock";
import {
  getOchbStaffIds,
  isOchbSiteAdmin,
  ochbSlotNumber,
  ratingPlayerDisplayName,
  ratingPlayerDisplayNames,
} from "./ochb-rating-staff";

export { ochbSlotNumber, ratingPlayerDisplayName };

export const OCHB_CONTROVERSIAL_NO_ID =
  "Привяжите свой ID на странице https://4gk.pl/account";

export const OCHB_CONTROVERSIAL_NOT_IN_ROSTER =
  "Состав вашей команды не подан либо вы не находитесь в поданном составе вашей команды. Подать состав можно здесь: https://4gk.pl/ochb/roster";

export const OCHB_CONTROVERSIAL_QUESTION_MIN = 1;
export const OCHB_CONTROVERSIAL_QUESTION_MAX = 90;

export const OCHB_CONTROVERSIAL_LOCKED = "Решение уже зафиксировано";
export const OCHB_CONTROVERSIAL_UNLOCK_FORBIDDEN = "Разблокировка невозможна";
export const OCHB_CONTROVERSIAL_HARD_DELETE_FORBIDDEN =
  "Удаление навсегда невозможно";
export const OCHB_CONTROVERSIAL_LOCK_PENDING = "Сначала выберите вердикт";

export type OchbControversialVerdict = "PENDING" | "ACCEPTED" | "REJECTED";

const VERDICTS = new Set<OchbControversialVerdict>([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
]);

export function parseVerdict(value: unknown): OchbControversialVerdict | null {
  if (typeof value !== "string") return null;
  return VERDICTS.has(value as OchbControversialVerdict)
    ? (value as OchbControversialVerdict)
    : null;
}

export type OchbControversialAccess =
  | {
      ok: true;
      playerChgkId: number;
      teamChgkId: number | null;
      isPageAdmin: boolean;
    }
  | { ok: false; reason: "no-id" | "not-in-roster" };

export type OchbControversialPageAccess =
  | { gate: "no-id" }
  | { gate: "not-in-roster" }
  | {
      gate: "ok";
      chgkId: number;
      isPageAdmin: boolean;
      canGraveyard: boolean;
      canUnlock: boolean;
      canSubmit: boolean;
      teamChgkId: number | null;
    };

export type OchbControversialMineItem = {
  id: string;
  questionNumber: number;
  answerText: string;
  status: OchbControversialVerdict;
  rationale: string | null;
  trashed: boolean;
};

export type OchbControversialAdminItem = Omit<
  OchbControversialMineItem,
  "trashed"
> & {
  locked: boolean;
  teamNumber: number | null;
  decidedByName: string | null;
};

export type OchbControversialLeader = {
  teamNumber: number | null;
  count: number;
  acceptedLocked: number;
  rejectedLocked: number;
};

/** Server-side: linked rating ID first, then player on a submitted ochb-2026 roster. */
export async function resolveOchbControversialAccess(
  userId: string,
): Promise<OchbControversialAccess> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { chgkId: true, role: true },
  });
  if (!user?.chgkId) return { ok: false, reason: "no-id" };

  const roster = await db.teamRoster.findFirst({
    where: {
      eventId: OCHB_EVENT_ID,
      teamChgkId: { not: null },
      players: { some: { chgkId: user.chgkId } },
    },
    select: { teamChgkId: true },
  });
  const teamChgkId = roster?.teamChgkId ?? null;
  const isPageAdmin = await isOchbControversialPageAdmin(user.role, user.chgkId);
  if (!teamChgkId && !isPageAdmin) return { ok: false, reason: "not-in-roster" };

  return {
    ok: true,
    playerChgkId: user.chgkId,
    teamChgkId,
    isPageAdmin,
  };
}

export async function resolveOchbControversialPageAccess(
  userId: string,
): Promise<OchbControversialPageAccess> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { chgkId: true, role: true, email: true },
  });
  if (!user?.chgkId) return { gate: "no-id" };

  const roster = await db.teamRoster.findFirst({
    where: {
      eventId: OCHB_EVENT_ID,
      teamChgkId: { not: null },
      players: { some: { chgkId: user.chgkId } },
    },
    select: { teamChgkId: true },
  });
  const teamChgkId = roster?.teamChgkId ?? null;
  const isPageAdmin = await isOchbControversialPageAdmin(user.role, user.chgkId);
  if (!teamChgkId && !isPageAdmin) return { gate: "not-in-roster" };

  return {
    gate: "ok",
    chgkId: user.chgkId,
    isPageAdmin,
    canGraveyard: await isOchbControversialGraveyardMember(
      user.role,
      user.chgkId,
    ),
    canUnlock: canUnlockOchchDecision(user.email),
    canSubmit: isPageAdmin || teamChgkId != null,
    teamChgkId,
  };
}

/** Спорные staff: gameJury of tournament 14496. An empty list leaves only site ADMIN. */
export async function getOchbControversialStaffIds(): Promise<Set<number> | null> {
  return getOchbStaffIds(["gameJury"]);
}

export async function isOchbControversialPageAdmin(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<boolean> {
  if (isOchbSiteAdmin(role)) return true;
  if (chgkId == null) return false;
  const ids = await getOchbControversialStaffIds();
  return ids?.has(chgkId) ?? false;
}

/** Trash to the graveyard: site ADMIN or Игровое жюри. Hard delete is disabled. */
export async function isOchbControversialGraveyardMember(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<boolean> {
  if (isOchbSiteAdmin(role)) return true;
  if (chgkId == null) return false;
  const ids = await getOchbStaffIds(["gameJury"]);
  return ids?.has(chgkId) ?? false;
}

function trimRationale(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

/** Submitter view: hide the real verdict until this row is locked. */
export function serializeControversialMineVerdict(
  locked: boolean,
  status: OchbControversialVerdict,
  rationale: string | null,
): Pick<OchbControversialMineItem, "status" | "rationale"> {
  if (!locked) return { status: "PENDING", rationale: null };
  return { status, rationale: trimRationale(rationale) };
}

function mapControversialMine(
  rows: {
    id: string;
    questionNumber: number;
    answerText: string;
    status: OchbControversialVerdict;
    rationale: string | null;
    locked: boolean;
    trashed: boolean;
  }[],
): OchbControversialMineItem[] {
  return rows.map((r) => ({
    id: r.id,
    questionNumber: r.questionNumber,
    answerText: r.answerText,
    trashed: r.trashed,
    ...serializeControversialMineVerdict(r.locked, r.status, r.rationale),
  }));
}

export async function loadOchbControversialMine(
  teamChgkId: number,
): Promise<OchbControversialMineItem[]> {
  const rows = await db.ochbControversial.findMany({
    where: { eventId: OCHB_EVENT_ID, teamChgkId },
    orderBy: [{ questionNumber: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      questionNumber: true,
      answerText: true,
      status: true,
      rationale: true,
      locked: true,
      trashed: true,
    },
  });
  return mapControversialMine(rows);
}

export async function loadOchbControversialMineByPlayer(
  playerChgkId: number,
): Promise<OchbControversialMineItem[]> {
  const rows = await db.ochbControversial.findMany({
    where: {
      eventId: OCHB_EVENT_ID,
      playerChgkId,
      teamChgkId: OCHB_ADMIN_TEAM_CHGK_ID,
    },
    orderBy: [{ questionNumber: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      questionNumber: true,
      answerText: true,
      status: true,
      rationale: true,
      locked: true,
      trashed: true,
    },
  });
  return mapControversialMine(rows);
}

async function loadOchbControversialAdminByTrashed(
  trashed: boolean,
): Promise<OchbControversialAdminItem[]> {
  const rows = await db.ochbControversial.findMany({
    where: { eventId: OCHB_EVENT_ID, trashed },
    orderBy: [{ questionNumber: "asc" }, { createdAt: "asc" }],
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
    locked: r.locked,
    teamNumber: ochbSlotNumber(r.teamChgkId),
    decidedByName:
      r.decidedByChgkId != null ? (names.get(r.decidedByChgkId) ?? null) : null,
  }));
}

export async function loadOchbControversialAdmin(): Promise<
  OchbControversialAdminItem[]
> {
  return loadOchbControversialAdminByTrashed(false);
}

export async function loadOchbControversialGraveyard(): Promise<
  OchbControversialAdminItem[]
> {
  return loadOchbControversialAdminByTrashed(true);
}

/**
 * `count` is every stored row, including trashed and unlocked.
 * `acceptedLocked` / `rejectedLocked` count only locked rows of that verdict,
 * including trashed. Unlocked and PENDING rows do not increment them.
 * Permanent delete is disabled; rows already removed are not in the table.
 */
export async function loadOchbControversialLeaders(): Promise<
  OchbControversialLeader[]
> {
  const grouped = await db.ochbControversial.groupBy({
    by: ["teamChgkId", "status", "locked"],
    where: { eventId: OCHB_EVENT_ID },
    _count: { id: true },
  });
  const byTeam = new Map<
    number,
    Pick<OchbControversialLeader, "count" | "acceptedLocked" | "rejectedLocked">
  >();
  for (const row of grouped) {
    const current = byTeam.get(row.teamChgkId) ?? {
      count: 0,
      acceptedLocked: 0,
      rejectedLocked: 0,
    };
    const n = row._count.id;
    current.count += n;
    if (row.locked && row.status === "ACCEPTED") current.acceptedLocked += n;
    else if (row.locked && row.status === "REJECTED") current.rejectedLocked += n;
    byTeam.set(row.teamChgkId, current);
  }
  return [...byTeam.entries()]
    .map(([teamChgkId, counts]) => ({
      teamNumber: ochbSlotNumber(teamChgkId),
      ...counts,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (
        (a.teamNumber ?? Number.MAX_SAFE_INTEGER) -
        (b.teamNumber ?? Number.MAX_SAFE_INTEGER)
      );
    });
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
    n >= OCHB_CONTROVERSIAL_QUESTION_MIN &&
    n <= OCHB_CONTROVERSIAL_QUESTION_MAX
  );
}
