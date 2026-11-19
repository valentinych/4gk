import { OCHB_RATING_TOURNAMENT_ID } from "@/lib/ochb";

const RESULTS = "https://api.rating.chgk.info";
const GG = "https://rating.chgk.gg/api/v1/b";
const REVALIDATE_SECONDS = 300;

/**
 * Технический рейтинг заявленного состава: взвешенная сумма пяти самых
 * сильных игроков. Веса 1, 0.8, 0.6, 0.4, 0.2. Шестой и остальные не входят.
 * Если игроков меньше пяти — веса с начала ряда, без виртуальных игроков.
 * Легионеры входят в пул. На Q релиза сумма не умножается.
 *
 * Рейтинг игрока — базовый, тот же, что в заявке турнира (TeamMember.rating):
 * индивидуальный рейтинг релиза, непосредственно предшествующего релизу,
 * в который входит турнир. Не рейтинг более нового релиза.
 */
const WEIGHT_TENTHS = [10, 8, 6, 4, 2] as const;

export function technicalRatingFromPlayerRatings(ratings: readonly number[]): number | null {
  const usable = ratings.filter((rating) => Number.isFinite(rating));
  if (usable.length === 0) return null;
  const top = [...usable].sort((a, b) => b - a).slice(0, WEIGHT_TENTHS.length);
  let tenths = 0;
  for (let i = 0; i < top.length; i++) tenths += top[i] * WEIGHT_TENTHS[i];
  return tenths / 10;
}

/** Whole number when the sum is whole, otherwise one decimal. */
export function formatTechnicalRating(value: number): string {
  const tenths = Math.round(value * 10);
  const whole = Math.trunc(tenths / 10);
  const frac = Math.abs(tenths % 10);
  if (frac === 0) return String(whole);
  return `${whole}.${frac}`;
}

interface RatingRosterRow {
  team?: { id?: unknown };
  teamMembers?: unknown;
}

interface GgRelease {
  id?: unknown;
  date?: unknown;
  tournaments?: { in_rating?: unknown; not_in_rating?: unknown };
}

interface PlayerReleaseItem {
  id?: unknown;
  rating?: unknown;
}

function memberRatings(members: unknown): number[] {
  if (!Array.isArray(members)) return [];
  const ratings: number[] = [];
  for (const member of members) {
    if (!member || typeof member !== "object") continue;
    const rating = (member as { rating?: unknown }).rating;
    if (typeof rating === "number" && Number.isFinite(rating)) ratings.push(rating);
  }
  return ratings;
}

function releaseListsTournament(release: GgRelease, tournamentId: number): boolean {
  const lists = [release.tournaments?.in_rating, release.tournaments?.not_in_rating];
  return lists.some((list) => Array.isArray(list) && list.includes(tournamentId));
}

/** Release whose player rating is TeamMember.rating for this tournament. */
function baseReleaseIdForTournament(releases: readonly GgRelease[], tournamentId: number): number | null {
  const sorted = [...releases].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const index = sorted.findIndex((release) => releaseListsTournament(release, tournamentId));
  if (index <= 0) return null;
  const id = sorted[index - 1]?.id;
  return typeof id === "number" ? id : null;
}

/**
 * Technical rating of each team that has a lineup on rating.chgk.info for this
 * tournament. Empty map if the rating API does not answer: the page still renders.
 */
export async function fetchOchbTechnicalRatings(
  tournamentId: number = OCHB_RATING_TOURNAMENT_ID,
): Promise<Map<number, number>> {
  try {
    const rosterRes = await fetch(
      `${RESULTS}/tournaments/${tournamentId}/results?includeTeamMembers=1`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: REVALIDATE_SECONDS },
      },
    );
    if (!rosterRes.ok) return new Map();
    const rows = (await rosterRes.json()) as unknown;
    if (!Array.isArray(rows)) return new Map();

    const byTeam = new Map<number, number>();
    for (const row of rows as RatingRosterRow[]) {
      const teamId = row?.team?.id;
      if (typeof teamId !== "number") continue;
      const ratings = memberRatings(row.teamMembers);
      const technical = technicalRatingFromPlayerRatings(ratings);
      if (technical == null) continue;
      byTeam.set(teamId, technical);
    }
    return byTeam;
  } catch {
    return new Map();
  }
}

async function fetchReleaseList(): Promise<GgRelease[]> {
  const res = await fetch(`${GG}/releases`, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { items?: GgRelease[] } | GgRelease[];
  return Array.isArray(body) ? body : (body.items ?? []);
}

async function fetchPlayerRatingAtRelease(playerId: number, releaseId: number): Promise<number | null> {
  try {
    const res = await fetch(`${GG}/players/${playerId}/releases`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { items?: PlayerReleaseItem[] } | PlayerReleaseItem[];
    const items = Array.isArray(body) ? body : (body.items ?? []);
    const hit = items.find((item) => item?.id === releaseId);
    const rating = hit?.rating;
    return typeof rating === "number" && Number.isFinite(rating) ? rating : null;
  } catch {
    return null;
  }
}

/**
 * Base ratings for these player ids at the same release the tournament lineup uses.
 * A missed player is absent from the map. An empty map if the release cannot be loaded.
 */
export async function fetchPlayerBaseRatings(
  playerIds: readonly number[],
  tournamentId: number = OCHB_RATING_TOURNAMENT_ID,
): Promise<Map<number, number>> {
  const unique = [...new Set(playerIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (unique.length === 0) return new Map();
  try {
    const releases = await fetchReleaseList();
    const releaseId = baseReleaseIdForTournament(releases, tournamentId);
    if (releaseId == null) return new Map();
    const pairs = await Promise.all(
      unique.map(async (playerId) => {
        const rating = await fetchPlayerRatingAtRelease(playerId, releaseId);
        return [playerId, rating] as const;
      }),
    );
    const byPlayer = new Map<number, number>();
    for (const [playerId, rating] of pairs) {
      if (rating != null) byPlayer.set(playerId, rating);
    }
    return byPlayer;
  } catch {
    return new Map();
  }
}
