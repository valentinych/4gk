import { fetchPlayer } from "./chgk";
import { OCHCH_RATING_TOURNAMENT_ID, OCHCH_TEAMS } from "./ochch";

export function isOchchSiteAdmin(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

export type OchchRatingStaffSection =
  | "orgcommittee"
  | "editors"
  | "gameJury"
  | "appealJury";

export type OchchRatingStaff = Record<OchchRatingStaffSection, number[]>;

const STAFF_TTL_MS = 15 * 60 * 1000;

type StaffCache = { staff: OchchRatingStaff; at: number };

const staffStore = globalThis as typeof globalThis & {
  __ochchRatingStaff?: StaffCache;
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

async function fetchOchchRatingStaff(): Promise<OchchRatingStaff | null> {
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
    const meta = (await res.json()) as Record<string, unknown>;
    return {
      orgcommittee: idsFromList(meta.orgcommittee),
      editors: idsFromList(meta.editors),
      gameJury: idsFromList(meta.gameJury),
      appealJury: idsFromList(meta.appealJury),
    };
  } catch {
    return null;
  }
}

/** Fresh lists when rating is up; last successful lists if rating is down; null if never fetched. */
export async function getOchchRatingStaff(): Promise<OchchRatingStaff | null> {
  const cached = staffStore.__ochchRatingStaff;
  if (cached && Date.now() - cached.at < STAFF_TTL_MS) {
    return cached.staff;
  }
  const fresh = await fetchOchchRatingStaff();
  if (fresh) {
    staffStore.__ochchRatingStaff = { staff: fresh, at: Date.now() };
    return fresh;
  }
  if (cached) return cached.staff;
  return null;
}

export async function getOchchStaffIds(
  sections: OchchRatingStaffSection[],
): Promise<Set<number> | null> {
  const staff = await getOchchRatingStaff();
  if (!staff) return null;
  const ids = new Set<number>();
  for (const key of sections) {
    for (const id of staff[key]) ids.add(id);
  }
  return ids;
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

export async function ratingPlayerDisplayNames(
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
