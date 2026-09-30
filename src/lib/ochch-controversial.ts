import { fetchPlayer } from "./chgk";
import { db } from "./db";
import {
  OCHCH_EVENT_ID,
  OCHCH_RATING_TOURNAMENT_ID,
  OCHCH_TEAMS,
} from "./ochch";

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
  | { ok: true; playerChgkId: number; teamChgkId: number }
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
    canSubmit: teamChgkId != null,
    teamChgkId,
  };
}

export async function isOchchControversialPageAdmin(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<boolean> {
  if (role === "ADMIN") return true;
  if (chgkId == null) return false;
  const ids = await getOchchControversialStaffIds();
  return ids?.has(chgkId) ?? false;
}

const STAFF_TTL_MS = 15 * 60 * 1000;

type StaffCache = { ids: number[]; at: number };

const staffStore = globalThis as typeof globalThis & {
  __ochchControversialStaff?: StaffCache;
};

async function fetchTournamentStaffIds(): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://api.rating.chgk.info/tournaments/${OCHCH_RATING_TOURNAMENT_ID}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const meta = (await res.json()) as {
      orgcommittee?: { id?: number }[];
      editors?: { id?: number }[];
      gameJury?: { id?: number }[];
    };
    const ids = new Set<number>();
    for (const list of [meta.orgcommittee, meta.editors, meta.gameJury]) {
      if (!Array.isArray(list)) continue;
      for (const person of list) {
        if (typeof person?.id === "number") ids.add(person.id);
      }
    }
    return [...ids];
  } catch {
    return null;
  }
}

/** Fresh list when rating is up; last successful list if rating is down; null if never fetched. */
export async function getOchchControversialStaffIds(): Promise<Set<number> | null> {
  const cached = staffStore.__ochchControversialStaff;
  if (cached && Date.now() - cached.at < STAFF_TTL_MS) {
    return new Set(cached.ids);
  }
  const fresh = await fetchTournamentStaffIds();
  if (fresh) {
    staffStore.__ochchControversialStaff = { ids: fresh, at: Date.now() };
    return new Set(fresh);
  }
  if (cached) return new Set(cached.ids);
  return null;
}

const SLOT_BY_TEAM = new Map(OCHCH_TEAMS.map((t) => [t.teamChgkId, t.number]));

export function ochchSlotNumber(teamChgkId: number): number | null {
  return SLOT_BY_TEAM.get(teamChgkId) ?? null;
}

const NAME_TTL_MS = 60 * 60 * 1000;
const nameCache = new Map<number, { name: string | null; at: number }>();

export async function ratingPlayerDisplayName(
  chgkId: number,
): Promise<string | null> {
  const hit = nameCache.get(chgkId);
  if (hit && Date.now() - hit.at < NAME_TTL_MS) return hit.name;
  const player = await fetchPlayer(chgkId);
  const name = player ? `${player.name} ${player.surname}`.trim() || null : null;
  nameCache.set(chgkId, { name, at: Date.now() });
  return name;
}

async function ratingPlayerDisplayNames(
  ids: number[],
): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((id) => id > 0))];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await ratingPlayerDisplayName(id)] as const),
  );
  const map = new Map<number, string>();
  for (const [id, name] of entries) {
    if (name) map.set(id, name);
  }
  return map;
}

function trimRationale(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
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
  return rows.map((r) => ({
    id: r.id,
    questionNumber: r.questionNumber,
    answerText: r.answerText,
    status: r.status,
    rationale: trimRationale(r.rationale),
  }));
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
