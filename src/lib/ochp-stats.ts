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

interface RatingResultRow {
  position: number;
  questionsTotal: number | null;
  flags?: unknown;
  current: { name: string; town: { name: string } };
}

async function fetchSeasonStat(seasonStart: number): Promise<OchpSeasonStatRow> {
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

  if (!base.held) return base;

  const tournamentId = resolveOchpRatingTournamentId(seasonStart);
  base.tournamentId = tournamentId;
  base.resultsHref = `/ochp/results-chgk?season=${seasonStart}`;

  try {
    const [metaRes, resultsRes] = await Promise.all([
      fetch(`https://api.rating.chgk.info/tournaments/${tournamentId}`, {
        next: { revalidate: 3600 },
      }),
      fetch(
        `https://api.rating.chgk.info/tournaments/${tournamentId}/results?${ratingChgkResultsQuery(0)}`,
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

    if (!resultsRes.ok) return base;

    const results = (await resultsRes.json()) as RatingResultRow[];
    const teams = results.filter((r) => r.position !== 9999);
    base.teamCount = teams.length;

    const byScore = (a: RatingResultRow, b: RatingResultRow) =>
      (b.questionsTotal ?? 0) - (a.questionsTotal ?? 0) ||
      a.position - b.position;

    const overall = [...teams].sort((a, b) => a.position - b.position)[0];
    if (overall) {
      base.overallWinner = {
        name: overall.current.name,
        city: overall.current.town.name,
        score: overall.questionsTotal ?? 0,
      };
    }

    const allPolish = OCHP_SEASON_CHST_ALL_TEAMS.has(seasonStart);
    const polishPool = allPolish
      ? teams
      : teams.filter((r) => resultHasChstFlag(r.flags));
    const polish = [...polishPool].sort(byScore)[0];
    if (polish) {
      base.polishWinner = {
        name: polish.current.name,
        city: polish.current.town.name,
        score: polish.questionsTotal ?? 0,
      };
    }
  } catch {
    // leave partial row
  }

  return base;
}

export async function fetchOchpAllSeasonStats(): Promise<OchpSeasonStatRow[]> {
  const seasons = [...ochpSeasonOptions()].reverse();
  return Promise.all(seasons.map((s) => fetchSeasonStat(s)));
}

export function ochpSeasonRatingUrl(tournamentId: number): string {
  return ochpRatingPublicUrl(tournamentId);
}
