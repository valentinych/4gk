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

export const OCHB_APPEAL_NO_ID =
  "Привяжите свой ID на странице https://4gk.pl/account";

export const OCHB_APPEAL_NOT_IN_ROSTER =
  "Состав вашей команды не подан либо вы не находитесь в поданном составе вашей команды. Подать состав можно здесь: https://4gk.pl/ochb/roster";

export const OCHB_APPEAL_ARGUMENTATION_REQUIRED =
  "Для Апелляций обоснование является обязательным";

export const OCHB_APPEAL_ADMIN_RATIONALE_REQUIRED =
  "Для принятия или отклонения апелляции заполните обоснование жюри";

export const OCHB_APPEAL_QUESTION_MIN = 1;
export const OCHB_APPEAL_QUESTION_MAX = 90;

export const OCHB_APPEAL_LOCKED = "Решение уже зафиксировано";
export const OCHB_APPEAL_UNLOCK_FORBIDDEN = "Разблокировка невозможна";
export const OCHB_APPEAL_LOCK_PENDING = "Сначала выберите вердикт";

export type OchbAppealKind = "REMOVE" | "CREDIT";
export type OchbAppealVerdict = "PENDING" | "ACCEPTED" | "REJECTED";

export const OCHB_APPEAL_KIND_LABELS: Record<OchbAppealKind, string> = {
  REMOVE: "На снятие",
  CREDIT: "На зачёт",
};

const KINDS = new Set<OchbAppealKind>(["REMOVE", "CREDIT"]);
const VERDICTS = new Set<OchbAppealVerdict>([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
]);

export function parseAppealKind(value: unknown): OchbAppealKind | null {
  if (typeof value !== "string") return null;
  return KINDS.has(value as OchbAppealKind) ? (value as OchbAppealKind) : null;
}

export function parseAppealVerdict(value: unknown): OchbAppealVerdict | null {
  if (typeof value !== "string") return null;
  return VERDICTS.has(value as OchbAppealVerdict)
    ? (value as OchbAppealVerdict)
    : null;
}

export type OchbAppealAccess =
  | {
      ok: true;
      playerChgkId: number;
      teamChgkId: number | null;
      isPageAdmin: boolean;
    }
  | { ok: false; reason: "no-id" | "not-in-roster" };

export type OchbAppealPageAccess =
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

export type OchbAppealMineItem = {
  id: string;
  kind: OchbAppealKind;
  questionNumber: number;
  answerText: string;
  argumentation: string;
  status: OchbAppealVerdict;
  adminRationale: string | null;
  trashed: boolean;
};

export type OchbAppealAdminItem = Omit<OchbAppealMineItem, "trashed"> & {
  locked: boolean;
  teamNumber: number | null;
  decidedByName: string | null;
};

export type OchbAppealLeader = {
  teamNumber: number | null;
  count: number;
};

/** Server-side: linked rating ID first, then player on a submitted ochb-2026 roster. */
export async function resolveOchbAppealAccess(
  userId: string,
): Promise<OchbAppealAccess> {
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
  const isPageAdmin = await isOchbAppealPageAdmin(user.role, user.chgkId);
  if (!teamChgkId && !isPageAdmin) return { ok: false, reason: "not-in-roster" };

  return {
    ok: true,
    playerChgkId: user.chgkId,
    teamChgkId,
    isPageAdmin,
  };
}

export async function resolveOchbAppealPageAccess(
  userId: string,
): Promise<OchbAppealPageAccess> {
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
  const isPageAdmin = await isOchbAppealPageAdmin(user.role, user.chgkId);
  if (!teamChgkId && !isPageAdmin) return { gate: "not-in-roster" };

  return {
    gate: "ok",
    chgkId: user.chgkId,
    isPageAdmin,
    canGraveyard: await isOchbAppealGraveyardMember(user.role, user.chgkId),
    canUnlock: canUnlockOchchDecision(user.email),
    canSubmit: isPageAdmin || teamChgkId != null,
    teamChgkId,
  };
}

/** Appeals staff: appealJury of tournament 14496. An empty list leaves only site ADMIN. */
export async function getOchbAppealStaffIds(): Promise<Set<number> | null> {
  return getOchbStaffIds(["appealJury"]);
}

export async function isOchbAppealPageAdmin(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<boolean> {
  if (isOchbSiteAdmin(role)) return true;
  if (chgkId == null) return false;
  const ids = await getOchbAppealStaffIds();
  return ids?.has(chgkId) ?? false;
}

/** Trash and hard-delete: site ADMIN or Апелляционное жюри. */
export async function isOchbAppealGraveyardMember(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<boolean> {
  if (isOchbSiteAdmin(role)) return true;
  if (chgkId == null) return false;
  const ids = await getOchbStaffIds(["appealJury"]);
  return ids?.has(chgkId) ?? false;
}

function trimText(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

/**
 * Pool unlock only clears the lock. Cemetery unlock returns the appeal to
 * the unreviewed pool. Jury rationale is not in the patch, so it stays.
 */
export function ochbAppealUnlockUpdate(trashed: boolean): {
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

/** Submitter view: hide the real verdict until this row is locked. */
export function serializeAppealMineVerdict(
  locked: boolean,
  status: OchbAppealVerdict,
  adminRationale: string | null,
): Pick<OchbAppealMineItem, "status" | "adminRationale"> {
  if (!locked) return { status: "PENDING", adminRationale: null };
  return { status, adminRationale: trimText(adminRationale) };
}

function mapAppealMine(
  rows: {
    id: string;
    kind: OchbAppealKind;
    questionNumber: number;
    answerText: string;
    argumentation: string;
    status: OchbAppealVerdict;
    adminRationale: string | null;
    locked: boolean;
    trashed: boolean;
  }[],
): OchbAppealMineItem[] {
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    questionNumber: r.questionNumber,
    answerText: r.answerText,
    argumentation: r.argumentation,
    trashed: r.trashed,
    ...serializeAppealMineVerdict(r.locked, r.status, r.adminRationale),
  }));
}

export async function loadOchbAppealMine(
  teamChgkId: number,
): Promise<OchbAppealMineItem[]> {
  const rows = await db.ochbAppeal.findMany({
    where: { eventId: OCHB_EVENT_ID, teamChgkId },
    orderBy: [{ questionNumber: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      kind: true,
      questionNumber: true,
      answerText: true,
      argumentation: true,
      status: true,
      adminRationale: true,
      locked: true,
      trashed: true,
    },
  });
  return mapAppealMine(rows);
}

export async function loadOchbAppealMineByPlayer(
  playerChgkId: number,
): Promise<OchbAppealMineItem[]> {
  const rows = await db.ochbAppeal.findMany({
    where: {
      eventId: OCHB_EVENT_ID,
      playerChgkId,
      teamChgkId: OCHB_ADMIN_TEAM_CHGK_ID,
    },
    orderBy: [{ questionNumber: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      kind: true,
      questionNumber: true,
      answerText: true,
      argumentation: true,
      status: true,
      adminRationale: true,
      locked: true,
      trashed: true,
    },
  });
  return mapAppealMine(rows);
}

async function loadOchbAppealAdminByTrashed(
  trashed: boolean,
): Promise<OchbAppealAdminItem[]> {
  const rows = await db.ochbAppeal.findMany({
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
    kind: r.kind,
    questionNumber: r.questionNumber,
    answerText: r.answerText,
    argumentation: r.argumentation,
    status: r.status,
    adminRationale: trimText(r.adminRationale),
    locked: r.locked,
    teamNumber: ochbSlotNumber(r.teamChgkId),
    decidedByName:
      r.decidedByChgkId != null ? (names.get(r.decidedByChgkId) ?? null) : null,
  }));
}

export async function loadOchbAppealAdmin(): Promise<OchbAppealAdminItem[]> {
  return loadOchbAppealAdminByTrashed(false);
}

export async function loadOchbAppealGraveyard(): Promise<OchbAppealAdminItem[]> {
  return loadOchbAppealAdminByTrashed(true);
}

/** Counts every stored row, including trashed. Hard-deleted rows are already gone. */
export async function loadOchbAppealLeaders(): Promise<OchbAppealLeader[]> {
  const grouped = await db.ochbAppeal.groupBy({
    by: ["teamChgkId"],
    where: { eventId: OCHB_EVENT_ID },
    _count: { id: true },
  });
  return grouped
    .map((row) => ({
      teamNumber: ochbSlotNumber(row.teamChgkId),
      count: row._count.id,
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
  return n >= OCHB_APPEAL_QUESTION_MIN && n <= OCHB_APPEAL_QUESTION_MAX;
}

export function requiresAdminRationale(status: OchbAppealVerdict): boolean {
  return status === "ACCEPTED" || status === "REJECTED";
}
