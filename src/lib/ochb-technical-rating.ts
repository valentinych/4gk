import { db } from "@/lib/db";
import {
  OCHB_EVENT_ID,
  OCHB_RATING_TOURNAMENT_ID,
  OCHB_TEAMS,
  ochbEventTeamChgkId,
  type OchbTeam,
} from "@/lib/ochb";

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

/**
 * Value shown on the participants page: the weighted sum divided by 10,
 * nearest integer. Halves round away from zero.
 */
export function displayedTechnicalRating(sum: number): number {
  const tenths = Math.round(sum * 10);
  const sign = tenths < 0 ? -1 : 1;
  const abs = Math.abs(tenths);
  return sign * (Math.trunc(abs / 100) + (abs % 100 >= 50 ? 1 : 0));
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

/** Displayed technical rating at or below this is «любители». 1800 is included. */
export const OCHB_AMATEUR_RATING_MAX = 1800;

/** A missing rating («—») is not amateur. */
export function isOchbAmateurRating(displayed: number | null | undefined): boolean {
  return displayed != null && displayed <= OCHB_AMATEUR_RATING_MAX;
}

/**
 * Labels on haza broadcast 684 that are not the participants-list name.
 * The participants page still shows the list name.
 */
const OCHB_HAZA_NAME_BY_NUMBER: Readonly<Record<number, string>> = {
  21: "Команда R",
  28: "Византийский консенсунс",
  29: "PSM",
};

interface SubmittedRoster {
  teamIds: Set<number>;
  playerIdsByTeam: Map<number, number[]>;
}

/** A roster is submitted once TeamRoster exists (POST requires ≥1 player). */
async function loadSubmittedRosters(): Promise<SubmittedRoster> {
  const empty: SubmittedRoster = { teamIds: new Set(), playerIdsByTeam: new Map() };
  if (!process.env.DATABASE_URL) return empty;
  try {
    const rosters = await db.teamRoster.findMany({
      where: { eventId: OCHB_EVENT_ID },
      select: {
        teamChgkId: true,
        updatedAt: true,
        players: { select: { chgkId: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    const teamIds = new Set<number>();
    const playerIdsByTeam = new Map<number, number[]>();
    for (const roster of rosters) {
      const teamId = roster.teamChgkId;
      if (teamId == null || teamId === 0) continue;
      teamIds.add(teamId);
      if (playerIdsByTeam.has(teamId)) continue;
      playerIdsByTeam.set(
        teamId,
        roster.players
          .map((player) => player.chgkId)
          .filter((id): id is number => id != null && id > 0),
      );
    }
    return { teamIds, playerIdsByTeam };
  } catch {
    return empty;
  }
}

function hasRatingTeamId(team: OchbTeam): boolean {
  return team.teamChgkId != null && team.teamChgkId > 0;
}

/**
 * Displayed technical rating of each team on the participants list, plus which
 * teams have a submitted lineup. Teams with no rating are absent from the map.
 * A rating id uses the tournament lineup. A team without one (Manychat,
 * Соборная) uses its submitted roster. This does not write rating ids.
 */
export async function loadOchbParticipantMarks(
  teams: readonly OchbTeam[] = OCHB_TEAMS,
): Promise<{ displayedByNumber: Map<number, number>; rosterTeamIds: Set<number> }> {
  const [rosters, technicalByTeam] = await Promise.all([
    loadSubmittedRosters(),
    fetchOchbTechnicalRatings(),
  ]);
  const rosterPlayerIds = teams
    .filter((team) => !hasRatingTeamId(team))
    .flatMap((team) => rosters.playerIdsByTeam.get(ochbEventTeamChgkId(team)) ?? []);
  const playerBaseRatings = await fetchPlayerBaseRatings(rosterPlayerIds);
  const displayedByNumber = new Map<number, number>();
  for (const team of teams) {
    let sum: number | undefined;
    if (team.teamChgkId != null && team.teamChgkId > 0) {
      sum = technicalByTeam.get(team.teamChgkId);
    } else {
      const playerIds = rosters.playerIdsByTeam.get(ochbEventTeamChgkId(team)) ?? [];
      if (playerIds.length > 0) {
        const ratings = playerIds
          .map((id) => playerBaseRatings.get(id))
          .filter((rating): rating is number => rating != null);
        sum = technicalRatingFromPlayerRatings(ratings) ?? undefined;
      }
    }
    if (sum == null) continue;
    displayedByNumber.set(team.number, displayedTechnicalRating(sum));
  }
  return { displayedByNumber, rosterTeamIds: rosters.teamIds };
}

/** Participants-list names of amateur teams, plus the broadcast label when it differs. */
export async function loadOchbAmateurBroadcastNames(): Promise<string[]> {
  const { displayedByNumber } = await loadOchbParticipantMarks();
  const names: string[] = [];
  for (const team of OCHB_TEAMS) {
    if (!isOchbAmateurRating(displayedByNumber.get(team.number))) continue;
    names.push(team.name);
    const alias = OCHB_HAZA_NAME_BY_NUMBER[team.number];
    if (alias) names.push(alias);
  }
  return names;
}
