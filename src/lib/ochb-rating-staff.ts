import {
  OCHB_ADMIN_TEAM_CHGK_ID,
  OCHB_RATING_TOURNAMENT_ID,
  OCHB_TEAMS,
  ochbEventTeamChgkId,
} from "./ochb";
import {
  ratingPlayerDisplayName,
  ratingPlayerDisplayNames,
} from "./ochch-rating-staff";

export { ratingPlayerDisplayName, ratingPlayerDisplayNames };

export function isOchbSiteAdmin(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

export type OchbRatingStaffSection = "gameJury" | "appealJury";

export type OchbRatingStaff = Record<OchbRatingStaffSection, number[]>;

/** A few minutes. Last successful lists stay if rating.chgk.info is down. */
const STAFF_TTL_MS = 5 * 60 * 1000;

type StaffCache = { staff: OchbRatingStaff; at: number };

const staffStore = globalThis as typeof globalThis & {
  __ochbRatingStaff?: StaffCache;
};

function idsFromList(list: unknown): number[] {
  if (!Array.isArray(list)) return [];
  const ids: number[] = [];
  for (const person of list) {
    if (
      person &&
      typeof person === "object" &&
      typeof (person as { id?: unknown }).id === "number"
    ) {
      ids.push((person as { id: number }).id);
    }
  }
  return ids;
}

async function fetchOchbRatingStaff(): Promise<OchbRatingStaff | null> {
  try {
    const res = await fetch(
      `https://api.rating.chgk.info/tournaments/${OCHB_RATING_TOURNAMENT_ID}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const meta = (await res.json()) as Record<string, unknown>;
    return {
      gameJury: idsFromList(meta.gameJury),
      appealJury: idsFromList(meta.appealJury),
    };
  } catch {
    return null;
  }
}

/** Fresh lists when rating is up; last successful lists if rating is down; null if never fetched. */
export async function getOchbRatingStaff(): Promise<OchbRatingStaff | null> {
  const cached = staffStore.__ochbRatingStaff;
  if (cached && Date.now() - cached.at < STAFF_TTL_MS) {
    return cached.staff;
  }
  const fresh = await fetchOchbRatingStaff();
  if (fresh) {
    staffStore.__ochbRatingStaff = { staff: fresh, at: Date.now() };
    return fresh;
  }
  if (cached) return cached.staff;
  return null;
}

export async function getOchbStaffIds(
  sections: OchbRatingStaffSection[],
): Promise<Set<number> | null> {
  const staff = await getOchbRatingStaff();
  if (!staff) return null;
  const ids = new Set<number>();
  for (const key of sections) {
    for (const id of staff[key]) ids.add(id);
  }
  return ids;
}

const SLOT_BY_TEAM = new Map(
  OCHB_TEAMS.map((t) => [ochbEventTeamChgkId(t), t.number]),
);

export function ochbSlotNumber(teamChgkId: number): number | null {
  if (teamChgkId === OCHB_ADMIN_TEAM_CHGK_ID) return 0;
  return SLOT_BY_TEAM.get(teamChgkId) ?? null;
}
