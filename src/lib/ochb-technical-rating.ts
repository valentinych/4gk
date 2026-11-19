import { OCHB_RATING_TOURNAMENT_ID } from "@/lib/ochb";

const RESULTS = "https://api.rating.chgk.info";
const RELEASES = "https://rating.chgk.gg/api/v1/b/releases";
const REVALIDATE_SECONDS = 300;

/**
 * Технический рейтинг заявленного состава (RT), целое.
 *
 * Документация API, поле TournamentPositionsBalanced.rt
 * (https://api.rating.chgk.info/docs.jsonld): «технический рейтинг команды
 * (умноженная на Q сумма рейтингов шести наиболее высокорейтинговых игроков
 * с коэффициентами 1, 5/6, ..., 1/6)».
 *
 * Так считает рейтинг (https://github.com/chgk-gg/rating-b/blob/main/scripts/tools.py
 * и constants.py): шесть наибольших teamMembers.rating заявки, коэффициенты
 * 6/6 … 1/6; если игроков меньше шести — коэффициенты с начала ряда, без
 * виртуальных игроков. Легионеры и свободные агенты входят в сумму. Сначала
 * сумма округляется до целого (half to even, как np.round), затем умножается
 * на Q релиза, в который турнир входит, и снова округляется до целого.
 * Q — среднее R/TRB ста лучших команд (scripts/teams.py), поле `q`:
 * https://rating.chgk.gg/api/v1/b/releases
 *
 * Рейтинг игрока уже лежит в заявке: «индивидуальный рейтинг в релизе,
 * предшествующем окончанию турнира» (поле TeamMember.rating).
 */
const COEFF_NUMERATORS = [6, 5, 4, 3, 2, 1] as const;
const Q_SCALE = 100_000;

export function technicalRatingFromPlayerRatings(
  ratings: readonly number[],
  q: number,
): number | null {
  if (!Number.isFinite(q)) return null;
  const usable = ratings.filter((rating) => Number.isFinite(rating));
  if (usable.length === 0) return null;
  const top = [...usable].sort((a, b) => b - a).slice(0, COEFF_NUMERATORS.length);
  let numerator = 0;
  for (let i = 0; i < top.length; i++) numerator += top[i] * COEFF_NUMERATORS[i];
  const roundedSum = roundDivHalfEven(numerator, 6);
  const qScaled = Math.round(q * Q_SCALE);
  return roundDivHalfEven(roundedSum * qScaled, Q_SCALE);
}

/** Round numerator/denominator to nearest integer, halves to even. */
function roundDivHalfEven(numerator: number, denominator: number): number {
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator - quotient * denominator;
  const twice = remainder * 2;
  if (twice < denominator) return quotient;
  if (twice > denominator) return quotient + 1;
  return quotient % 2 === 0 ? quotient : quotient + 1;
}

interface RatingRosterRow {
  team?: { id?: unknown };
  teamMembers?: unknown;
}

interface GgRelease {
  date?: unknown;
  q?: unknown;
  tournaments?: { in_rating?: unknown; not_in_rating?: unknown };
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

export function releaseQForTournament(releases: readonly GgRelease[], tournamentId: number): number | null {
  const hits = releases
    .filter((release) => releaseListsTournament(release, tournamentId))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const q = hits[0]?.q;
  return typeof q === "number" && Number.isFinite(q) ? q : null;
}

/**
 * Technical rating of each team that has a lineup on rating.chgk.info for this
 * tournament. Empty map if the rating API does not answer: the page still renders.
 */
export async function fetchOchbTechnicalRatings(
  tournamentId: number = OCHB_RATING_TOURNAMENT_ID,
): Promise<Map<number, number>> {
  try {
    const [rosterRes, releasesRes] = await Promise.all([
      fetch(`${RESULTS}/tournaments/${tournamentId}/results?includeTeamMembers=1`, {
        headers: { Accept: "application/json" },
        next: { revalidate: REVALIDATE_SECONDS },
      }),
      fetch(RELEASES, {
        headers: { Accept: "application/json" },
        next: { revalidate: REVALIDATE_SECONDS },
      }),
    ]);
    if (!rosterRes.ok || !releasesRes.ok) return new Map();
    const rows = (await rosterRes.json()) as unknown;
    const releasesBody = (await releasesRes.json()) as { items?: GgRelease[] } | GgRelease[];
    const releases = Array.isArray(releasesBody) ? releasesBody : (releasesBody.items ?? []);
    const q = releaseQForTournament(releases, tournamentId);
    if (q == null || !Array.isArray(rows)) return new Map();

    const byTeam = new Map<number, number>();
    for (const row of rows as RatingRosterRow[]) {
      const teamId = row?.team?.id;
      if (typeof teamId !== "number") continue;
      const ratings = memberRatings(row.teamMembers);
      if (ratings.length === 0) continue;
      const technical = technicalRatingFromPlayerRatings(ratings, q);
      if (technical == null) continue;
      byTeam.set(teamId, technical);
    }
    return byTeam;
  } catch {
    return new Map();
  }
}
