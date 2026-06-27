import {
  formatOchpChampionshipYear,
  formatOchpTournamentDateRange,
  ochpRatingPublicUrl,
  ochpSeasonHadNoChampionship,
  ochpSeasonOptions,
  ochpYearSuffix,
  resolveOchpRatingTournamentId,
  OCHP_SEASON_CHST_ALL_TEAMS,
} from "@/lib/ochp-seasons";
import {
  ratingChgkResultsQuery,
  resultHasChstFlag,
} from "@/lib/chgk-tournament-results";

export interface OchpSeasonWinner {
  name: string;
  city: string;
  score: number;
}

export interface OchpSeasonStatRow {
  seasonStart: number;
  label: string;
  championshipYear: string;
  held: boolean;
  dateLabel: string | null;
  teamCount: number | null;
  overallWinner: OchpSeasonWinner | null;
  polishWinner: OchpSeasonWinner | null;
  tournamentId: number | null;
  resultsHref: string | null;
}

export interface OchpTeamPodiumRow {
  teamId: number;
  name: string;
  city: string;
  gold: number;
  silver: number;
  bronze: number;
}

export interface OchpPlayerPodiumRow {
  playerId: number;
  name: string;
  gold: number;
  silver: number;
  bronze: number;
}

export interface OchpStatsPageData {
  seasons: OchpSeasonStatRow[];
  teamPodium: OchpTeamPodiumRow[];
  playerPodium: OchpPlayerPodiumRow[];
}

interface RatingPlayer {
  id: number;
  name: string;
  surname: string;
}

interface RatingResultRow {
  team: { id: number };
  position: number;
  questionsTotal: number | null;
  flags?: unknown;
  current: { name: string; town: { name: string } };
  teamMembers?: { player: RatingPlayer }[];
}

interface PolishPodiumEntry {
  teamId: number;
  name: string;
  city: string;
  rank: number;
  members: RatingPlayer[];
}

const byPolishScore = (a: RatingResultRow, b: RatingResultRow) =>
  (b.questionsTotal ?? 0) - (a.questionsTotal ?? 0) ||
  a.position - b.position;

function polishPoolForSeason(
  teams: RatingResultRow[],
  seasonStart: number,
): RatingResultRow[] {
  if (OCHP_SEASON_CHST_ALL_TEAMS.has(seasonStart)) return teams;
  return teams.filter((r) => resultHasChstFlag(r.flags));
}

/** Места с учётом ничьих: 1, 1, 3 — как в официальном зачёте. */
function assignCompetitionRanks(
  sorted: RatingResultRow[],
): PolishPodiumEntry[] {
  const out: PolishPodiumEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let rank = i + 1;
    if (i > 0 && sorted[i].questionsTotal === sorted[i - 1].questionsTotal) {
      rank = out[i - 1]!.rank;
    }
    out.push({
      teamId: sorted[i]!.team.id,
      name: sorted[i]!.current.name,
      city: sorted[i]!.current.town.name,
      rank,
      members: (sorted[i]!.teamMembers ?? []).map((m) => m.player),
    });
  }
  return out;
}

function polishPodiumForSeason(
  teams: RatingResultRow[],
  seasonStart: number,
): PolishPodiumEntry[] {
  const pool = polishPoolForSeason(teams, seasonStart);
  if (pool.length === 0) return [];
  const ranked = assignCompetitionRanks([...pool].sort(byPolishScore));
  return ranked.filter((e) => e.rank <= 3);
}

function bumpMedal(
  counts: { gold: number; silver: number; bronze: number },
  rank: number,
): void {
  if (rank === 1) counts.gold += 1;
  else if (rank === 2) counts.silver += 1;
  else if (rank === 3) counts.bronze += 1;
}

function aggregatePodiums(
  podiumsBySeason: PolishPodiumEntry[][],
): { teams: OchpTeamPodiumRow[]; players: OchpPlayerPodiumRow[] } {
  const teamMap = new Map<
    number,
    { name: string; city: string; gold: number; silver: number; bronze: number }
  >();
  const playerMap = new Map<
    number,
    { name: string; gold: number; silver: number; bronze: number }
  >();

  for (const seasonPodium of podiumsBySeason) {
    for (const entry of seasonPodium) {
      let team = teamMap.get(entry.teamId);
      if (!team) {
        team = {
          name: entry.name,
          city: entry.city,
          gold: 0,
          silver: 0,
          bronze: 0,
        };
        teamMap.set(entry.teamId, team);
      } else {
        team.name = entry.name;
        team.city = entry.city;
      }
      bumpMedal(team, entry.rank);

      for (const p of entry.members) {
        const label = `${p.name} ${p.surname}`.trim();
        let player = playerMap.get(p.id);
        if (!player) {
          player = { name: label, gold: 0, silver: 0, bronze: 0 };
          playerMap.set(p.id, player);
        } else {
          player.name = label;
        }
        bumpMedal(player, entry.rank);
      }
    }
  }

  const sortPodium = <T extends { gold: number; silver: number; bronze: number; name: string }>(
    a: T,
    b: T,
  ) =>
    b.gold - a.gold ||
    b.silver - a.silver ||
    b.bronze - a.bronze ||
    a.name.localeCompare(b.name, "ru");

  const teams = [...teamMap.entries()]
    .map(([teamId, t]) => ({ teamId, ...t }))
    .filter((t) => t.gold + t.silver + t.bronze > 0)
    .sort(sortPodium);

  const players = [...playerMap.entries()]
    .map(([playerId, p]) => ({ playerId, ...p }))
    .filter((p) => p.gold + p.silver + p.bronze > 0)
    .sort(sortPodium);

  return { teams, players };
}

interface SeasonFetchResult {
  stat: OchpSeasonStatRow;
  polishPodium: PolishPodiumEntry[];
}

async function fetchSeasonData(seasonStart: number): Promise<SeasonFetchResult> {
  const label = `ОЧП'${ochpYearSuffix(seasonStart)}`;
  const championshipYear = formatOchpChampionshipYear(seasonStart);
  const base: OchpSeasonStatRow = {
    seasonStart,
    label,
    championshipYear,
    held: !ochpSeasonHadNoChampionship(seasonStart),
    dateLabel: null,
    teamCount: null,
    overallWinner: null,
    polishWinner: null,
    tournamentId: null,
    resultsHref: null,
  };

  if (!base.held) {
    return { stat: base, polishPodium: [] };
  }

  const tournamentId = resolveOchpRatingTournamentId(seasonStart);
  base.tournamentId = tournamentId;
  base.resultsHref = `/ochp/results-chgk?season=${seasonStart}`;

  let polishPodium: PolishPodiumEntry[] = [];

  try {
    const [metaRes, resultsRes] = await Promise.all([
      fetch(`https://api.rating.chgk.info/tournaments/${tournamentId}`, {
        next: { revalidate: 3600 },
      }),
      fetch(
        `https://api.rating.chgk.info/tournaments/${tournamentId}/results?${ratingChgkResultsQuery(1)}`,
        { next: { revalidate: 3600 } },
      ),
    ]);

    if (metaRes.ok) {
      const meta = (await metaRes.json()) as {
        dateStart?: string;
        dateEnd?: string;
      };
      if (meta.dateStart && meta.dateEnd) {
        base.dateLabel = formatOchpTournamentDateRange(
          meta.dateStart,
          meta.dateEnd,
        );
      }
    }

    if (!resultsRes.ok) return { stat: base, polishPodium };

    const results = (await resultsRes.json()) as RatingResultRow[];
    const teams = results.filter((r) => r.position !== 9999);
    base.teamCount = teams.length;

    const overall = [...teams].sort((a, b) => a.position - b.position)[0];
    if (overall) {
      base.overallWinner = {
        name: overall.current.name,
        city: overall.current.town.name,
        score: overall.questionsTotal ?? 0,
      };
    }

    const polishPool = polishPoolForSeason(teams, seasonStart);
    const polish = [...polishPool].sort(byPolishScore)[0];
    if (polish) {
      base.polishWinner = {
        name: polish.current.name,
        city: polish.current.town.name,
        score: polish.questionsTotal ?? 0,
      };
    }

    polishPodium = polishPodiumForSeason(teams, seasonStart);
  } catch {
    // leave partial row
  }

  return { stat: base, polishPodium };
}

export async function fetchOchpStatsPageData(): Promise<OchpStatsPageData> {
  const seasons = [...ochpSeasonOptions()].reverse();
  const fetched = await Promise.all(seasons.map((s) => fetchSeasonData(s)));
  const { teams, players } = aggregatePodiums(
    fetched.map((f) => f.polishPodium),
  );
  return {
    seasons: fetched.map((f) => f.stat),
    teamPodium: teams,
    playerPodium: players,
  };
}

export async function fetchOchpAllSeasonStats(): Promise<OchpSeasonStatRow[]> {
  const data = await fetchOchpStatsPageData();
  return data.seasons;
}

export function ochpSeasonRatingUrl(tournamentId: number): string {
  return ochpRatingPublicUrl(tournamentId);
}
