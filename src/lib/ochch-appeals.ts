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

export const OCHCH_APPEAL_NO_ID =
  "Привяжите свой ID на странице https://4gk.pl/account";

export const OCHCH_APPEAL_NOT_IN_ROSTER =
  "Состав вашей команды не подан либо вы не находитесь в поданном составе вашей команды. Подать состав можно здесь: https://4gk.pl/ochch/roster";

export const OCHCH_APPEAL_ARGUMENTATION_REQUIRED =
  "Для Апелляций обоснование является обязательным";

export const OCHCH_APPEAL_ADMIN_RATIONALE_REQUIRED =
  "Для принятия или отклонения апелляции заполните обоснование жюри";

export const OCHCH_APPEAL_QUESTION_MIN = 1;
export const OCHCH_APPEAL_QUESTION_MAX = 105;

export const OCHCH_APPEAL_LOCKED = "Решение уже зафиксировано";
export const OCHCH_APPEAL_UNLOCK_FORBIDDEN = "Разблокировка невозможна";
export const OCHCH_APPEAL_LOCK_PENDING = "Сначала выберите вердикт";

export type OchchAppealKind = "REMOVE" | "CREDIT";
export type OchchAppealVerdict = "PENDING" | "ACCEPTED" | "REJECTED";

export const OCHCH_APPEAL_KIND_LABELS: Record<OchchAppealKind, string> = {
  REMOVE: "На снятие",
  CREDIT: "На зачёт",
};

const KINDS = new Set<OchchAppealKind>(["REMOVE", "CREDIT"]);
const VERDICTS = new Set<OchchAppealVerdict>([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
]);

export function parseAppealKind(value: unknown): OchchAppealKind | null {
  if (typeof value !== "string") return null;
  return KINDS.has(value as OchchAppealKind) ? (value as OchchAppealKind) : null;
}

export function parseAppealVerdict(value: unknown): OchchAppealVerdict | null {
  if (typeof value !== "string") return null;
  return VERDICTS.has(value as OchchAppealVerdict)
    ? (value as OchchAppealVerdict)
    : null;
}

export type OchchAppealAccess =
  | {
      ok: true;
      playerChgkId: number;
      teamChgkId: number | null;
      isPageAdmin: boolean;
    }
  | { ok: false; reason: "no-id" | "not-in-roster" };

export type OchchAppealPageAccess =
  | { gate: "no-id" }
  | { gate: "not-in-roster" }
  | {
      gate: "ok";
      chgkId: number;
      isPageAdmin: boolean;
      canSubmit: boolean;
      teamChgkId: number | null;
    };

export type OchchAppealMineItem = {
  id: string;
  kind: OchchAppealKind;
  questionNumber: number;
  answerText: string;
  argumentation: string;
  status: OchchAppealVerdict;
  adminRationale: string | null;
};

export type OchchAppealAdminItem = OchchAppealMineItem & {
  locked: boolean;
  teamNumber: number | null;
  decidedByName: string | null;
};

/** Server-side: linked rating ID first, then player on a submitted ochch-2026 roster. */
export async function resolveOchchAppealAccess(
  userId: string,
): Promise<OchchAppealAccess> {
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
  const isPageAdmin = await isOchchAppealPageAdmin(user.role, user.chgkId);
  if (!teamChgkId && !isPageAdmin) return { ok: false, reason: "not-in-roster" };

  return {
    ok: true,
    playerChgkId: user.chgkId,
    teamChgkId,
    isPageAdmin,
  };
}

export async function resolveOchchAppealPageAccess(
  userId: string,
): Promise<OchchAppealPageAccess> {
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
  const isPageAdmin = await isOchchAppealPageAdmin(user.role, user.chgkId);
  if (!teamChgkId && !isPageAdmin) return { gate: "not-in-roster" };

  return {
    gate: "ok",
    chgkId: user.chgkId,
    isPageAdmin,
    canSubmit: isPageAdmin || teamChgkId != null,
    teamChgkId,
  };
}

/** Appeals staff: orgcommittee + appealJury. Not editors, not gameJury. */
export async function getOchchAppealStaffIds(): Promise<Set<number> | null> {
  return getOchchStaffIds(["orgcommittee", "appealJury"]);
}

export async function isOchchAppealPageAdmin(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<boolean> {
  if (isOchchSiteAdmin(role)) return true;
  if (chgkId == null) return false;
  const ids = await getOchchAppealStaffIds();
  return ids?.has(chgkId) ?? false;
}

function trimText(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

/** Submitter view: hide the real verdict until this row is locked. */
export function serializeAppealMineVerdict(
  locked: boolean,
  status: OchchAppealVerdict,
  adminRationale: string | null,
): Pick<OchchAppealMineItem, "status" | "adminRationale"> {
  if (!locked) return { status: "PENDING", adminRationale: null };
  return { status, adminRationale: trimText(adminRationale) };
}

function mapAppealMine(
  rows: {
    id: string;
    kind: OchchAppealKind;
    questionNumber: number;
    answerText: string;
    argumentation: string;
    status: OchchAppealVerdict;
    adminRationale: string | null;
    locked: boolean;
  }[],
): OchchAppealMineItem[] {
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    questionNumber: r.questionNumber,
    answerText: r.answerText,
    argumentation: r.argumentation,
    ...serializeAppealMineVerdict(r.locked, r.status, r.adminRationale),
  }));
}

export async function loadOchchAppealMine(
  teamChgkId: number,
): Promise<OchchAppealMineItem[]> {
  const rows = await db.ochchAppeal.findMany({
    where: { eventId: OCHCH_EVENT_ID, teamChgkId, trashed: false },
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
    },
  });
  return mapAppealMine(rows);
}

export async function loadOchchAppealMineByPlayer(
  playerChgkId: number,
): Promise<OchchAppealMineItem[]> {
  const rows = await db.ochchAppeal.findMany({
    where: {
      eventId: OCHCH_EVENT_ID,
      playerChgkId,
      teamChgkId: OCHCH_ADMIN_TEAM_CHGK_ID,
      trashed: false,
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
    },
  });
  return mapAppealMine(rows);
}

async function loadOchchAppealAdminByTrashed(
  trashed: boolean,
): Promise<OchchAppealAdminItem[]> {
  const rows = await db.ochchAppeal.findMany({
    where: { eventId: OCHCH_EVENT_ID, trashed },
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
    teamNumber: ochchSlotNumber(r.teamChgkId),
    decidedByName:
      r.decidedByChgkId != null ? (names.get(r.decidedByChgkId) ?? null) : null,
  }));
}

export async function loadOchchAppealAdmin(): Promise<OchchAppealAdminItem[]> {
  return loadOchchAppealAdminByTrashed(false);
}

export async function loadOchchAppealGraveyard(): Promise<OchchAppealAdminItem[]> {
  return loadOchchAppealAdminByTrashed(true);
}

export function parseQuestionNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return parseInt(value.trim(), 10);
  }
  return null;
}

export function isValidQuestionNumber(n: number): boolean {
  return n >= OCHCH_APPEAL_QUESTION_MIN && n <= OCHCH_APPEAL_QUESTION_MAX;
}

export function requiresAdminRationale(status: OchchAppealVerdict): boolean {
  return status === "ACCEPTED" || status === "REJECTED";
}
