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
import {
  ochbQuestionNumberWhere,
  ochbTourRangeForPlayer,
  scopeForOchbModerator,
  type OchbControversialQuestionScope,
} from "./ochb-tour-editors";

export type { OchbControversialQuestionScope };

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
      /** Null for a player. Tour editors get `range` even when they are also ИЖ. */
      moderationScope: OchbControversialQuestionScope | null;
    }
  | { ok: false; reason: "no-id" | "not-in-roster" };

export type OchbControversialPageAccess =
  | { gate: "no-id" }
  | { gate: "not-in-roster" }
  | {
      gate: "ok";
      chgkId: number | null;
      isPageAdmin: boolean;
      moderationScope: OchbControversialQuestionScope | null;
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
  const moderationScope = await resolveOchbModerationScope(user.role, user.chgkId);
  const isPageAdmin = moderationScope != null;
  if (!teamChgkId && !isPageAdmin) return { ok: false, reason: "not-in-roster" };

  return {
    ok: true,
    playerChgkId: user.chgkId,
    teamChgkId,
    isPageAdmin,
    moderationScope,
  };
}

export async function resolveOchbControversialPageAccess(
  userId: string,
): Promise<OchbControversialPageAccess> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { chgkId: true, role: true, email: true },
  });
  if (!user) return { gate: "no-id" };
  if (!user.chgkId && !isOchbSiteAdmin(user.role)) return { gate: "no-id" };

  const roster = user.chgkId
    ? await db.teamRoster.findFirst({
        where: {
          eventId: OCHB_EVENT_ID,
          teamChgkId: { not: null },
          players: { some: { chgkId: user.chgkId } },
        },
        select: { teamChgkId: true },
      })
    : null;
  const teamChgkId = roster?.teamChgkId ?? null;
  const moderationScope = await resolveOchbModerationScope(user.role, user.chgkId);
  const isPageAdmin = moderationScope != null;
  if (!teamChgkId && !isPageAdmin) return { gate: "not-in-roster" };

  return {
    gate: "ok",
    chgkId: user.chgkId,
    isPageAdmin,
    moderationScope,
    canGraveyard: await isOchbControversialGraveyardMember(
      user.role,
      user.chgkId,
    ),
    canUnlock: canUnlockOchchDecision(user.email),
    canSubmit: user.chgkId != null && (isPageAdmin || teamChgkId != null),
    teamChgkId,
  };
}

/** Спорные staff: gameJury of tournament 14496. An empty list leaves only site ADMIN. */
export async function getOchbControversialStaffIds(): Promise<Set<number> | null> {
  return getOchbStaffIds(["gameJury"]);
}

/**
 * Who may open the moderator UI, and for which questions.
 * Site ADMIN, including one with no rating id: every question.
 * ИЖ outside the tour-editor map: every question. Appeal jury is not staff here.
 * A tour editor, including one who is also ИЖ: only that tour.
 * Rating being down does not remove a tour editor; it still drops other ИЖ.
 */
export async function resolveOchbModerationScope(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<OchbControversialQuestionScope | null> {
  const isSiteAdmin = isOchbSiteAdmin(role);
  const playerId = chgkId ?? null;
  let isGameJury = false;
  if (!isSiteAdmin && playerId != null && ochbTourRangeForPlayer(playerId) == null) {
    const ids = await getOchbControversialStaffIds();
    isGameJury = ids?.has(playerId) ?? false;
  }
  return scopeForOchbModerator({ isSiteAdmin, playerId, isGameJury });
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

/**
 * Pool unlock only clears the lock. Cemetery unlock also leaves the cemetery
 * and clears the verdict. Rationale is not in the patch, so the comment stays.
 */
export function ochbControversialUnlockUpdate(trashed: boolean): {
  locked: false;
  lockedAt: null;
  lockedByChgkId: null;
  trashed?: false;
  status?: "PENDING";
  decidedByChgkId?: null;
  decidedAt?: null;
} {
  const cleared = {
    locked: false as const,
    lockedAt: null,
    lockedByChgkId: null,
  };
  if (!trashed) return cleared;
  return {
    ...cleared,
    trashed: false,
    status: "PENDING",
    decidedByChgkId: null,
    decidedAt: null,
  };
}

/** Absent means “do not touch the stored comment”. Locked rows keep theirs. */
export function ochbControversialCommentUpdate(
  locked: boolean,
  rationale: string | null | undefined,
): { rationale?: string | null } {
  if (locked || rationale === undefined) return {};
  return { rationale };
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
  scope: OchbControversialQuestionScope,
): Promise<OchbControversialAdminItem[]> {
  const rows = await db.ochbControversial.findMany({
    where: {
      eventId: OCHB_EVENT_ID,
      trashed,
      ...ochbQuestionNumberWhere(scope),
    },
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

export async function loadOchbControversialAdmin(
  scope: OchbControversialQuestionScope,
): Promise<OchbControversialAdminItem[]> {
  return loadOchbControversialAdminByTrashed(false, scope);
}

export async function loadOchbControversialGraveyard(
  scope: OchbControversialQuestionScope,
): Promise<OchbControversialAdminItem[]> {
  return loadOchbControversialAdminByTrashed(true, scope);
}

/**
 * `count` is every stored row, including trashed and unlocked.
 * `acceptedLocked` / `rejectedLocked` count only locked rows of that verdict,
 * including trashed. Unlocked and PENDING rows do not increment them.
 * Permanent delete is disabled; rows already removed are not in the table.
 */
export async function loadOchbControversialLeaders(
  scope: OchbControversialQuestionScope,
): Promise<OchbControversialLeader[]> {
  const grouped = await db.ochbControversial.groupBy({
    by: ["teamChgkId", "status", "locked"],
    where: { eventId: OCHB_EVENT_ID, ...ochbQuestionNumberWhere(scope) },
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
