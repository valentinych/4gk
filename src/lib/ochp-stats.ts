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

export interface OchpPlayerCountRow {
  playerId: number;
  name: string;
  count: number;
}

export interface OchpStaffRow {
  playerId: number;
  name: string;
  orgcommittee: number;
  editor: number;
  gameJury: number;
  appealJury: number;
  total: number;
}

export interface OchpStatsPageData {
  seasons: OchpSeasonStatRow[];
  teamPodium: OchpTeamPodiumRow[];
  playerPodium: OchpPlayerPodiumRow[];
  topParticipations: OchpPlayerCountRow[];
  topQuestions: OchpPlayerCountRow[];
  staff: OchpStaffRow[];
}

export const OCHP_STATS_PAGE_SIZE = 10;
export const OCHP_STATS_TOP_N = 30;
/** Включать в топ всех игроков с этим числом участий (ничья на границе топ-30). */
export const OCHP_PARTICIPATION_INCLUDE_COUNT = 5;
/** Включать в топ всех игроков с этой суммой взятых вопросов. */
export const OCHP_QUESTIONS_INCLUDE_COUNT = 226;

export type OchpStatsSortDir = "asc" | "desc";

export type OchpStatsTableId =
  | "seasons"
  | "teams"
  | "players"
  | "participations"
  | "questions"
  | "staff";

const OCHP_STATS_SORT_COLUMNS: Record<OchpStatsTableId, readonly string[]> = {
  seasons: ["teamCount"],
  teams: ["gold", "silver", "bronze"],
  players: ["gold", "silver", "bronze"],
  participations: ["count"],
  questions: ["count"],
  staff: ["orgcommittee", "editor", "gameJury", "appealJury", "total"],
};

const OCHP_STATS_DEFAULT_SORT: Record<OchpStatsTableId, string> = {
  seasons: "teamCount",
  teams: "gold",
  players: "gold",
  participations: "count",
  questions: "count",
  staff: "total",
};

export function resolveOchpStatsSort(
  table: OchpStatsTableId,
  sortBy: string | null | undefined,
  sortDir: string | null | undefined,
): { sortBy: string; sortDir: OchpStatsSortDir } {
  const allowed = OCHP_STATS_SORT_COLUMNS[table];
  const by =
    sortBy && allowed.includes(sortBy) ? sortBy : OCHP_STATS_DEFAULT_SORT[table];
  const dir: OchpStatsSortDir =
    sortDir === "asc" || sortDir === "desc" ? sortDir : "desc";
  return { sortBy: by, sortDir: dir };
}

function sortByName<T extends { name: string }>(
  a: T,
  b: T,
  mul: number,
): number {
  return mul * a.name.localeCompare(b.name, "ru");
}

function sortRows<T extends { name: string }>(
  rows: T[],
  sortBy: string,
  sortDir: OchpStatsSortDir,
  nameKey: keyof T = "name" as keyof T,
): T[] {
  const mul = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sortBy as keyof T];
    const bv = b[sortBy as keyof T];
    if (typeof av === "number" && typeof bv === "number") {
      return mul * (av - bv) || sortByName(a, b, 1);
    }
    if (sortBy === nameKey) {
      return sortByName(a, b, mul);
    }
    return 0;
  });
}

function sortSeasonRows(
  rows: OchpSeasonStatRow[],
  sortBy: string,
  sortDir: OchpStatsSortDir,
): OchpSeasonStatRow[] {
  const mul = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortBy === "teamCount") {
      const av = a.teamCount ?? -1;
      const bv = b.teamCount ?? -1;
      return mul * (av - bv) || a.label.localeCompare(b.label, "ru");
    }
    return 0;
  });
}

export interface OchpStatsPaginatedResponse<T> {
  table: OchpStatsTableId;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: T[];
}

export function paginateOchpStats<T>(
  items: T[],
  page: number,
  pageSize = OCHP_STATS_PAGE_SIZE,
): Omit<OchpStatsPaginatedResponse<T>, "table"> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    rows: items.slice(start, start + pageSize),
  };
}

export function paginateOchpStatsTable(
  data: OchpStatsPageData,
  table: OchpStatsTableId,
  page: number,
  pageSize = OCHP_STATS_PAGE_SIZE,
  sortBy?: string | null,
  sortDir?: string | null,
):
  | OchpStatsPaginatedResponse<OchpSeasonStatRow>
  | OchpStatsPaginatedResponse<OchpTeamPodiumRow>
  | OchpStatsPaginatedResponse<OchpPlayerPodiumRow>
  | OchpStatsPaginatedResponse<OchpPlayerCountRow>
  | OchpStatsPaginatedResponse<OchpStaffRow> {
  const sort = resolveOchpStatsSort(table, sortBy, sortDir);

  if (table === "seasons") {
    const rows = sortSeasonRows(data.seasons, sort.sortBy, sort.sortDir);
    return { table, ...paginateOchpStats(rows, page, pageSize) };
  }
  if (table === "teams") {
    const rows = sortRows(data.teamPodium, sort.sortBy, sort.sortDir);
    return { table, ...paginateOchpStats(rows, page, pageSize) };
  }
  if (table === "players") {
    const rows = sortRows(data.playerPodium, sort.sortBy, sort.sortDir);
    return { table, ...paginateOchpStats(rows, page, pageSize) };
  }
  if (table === "participations") {
    const rows = sortRows(data.topParticipations, sort.sortBy, sort.sortDir);
    return { table, ...paginateOchpStats(rows, page, pageSize) };
  }
  if (table === "questions") {
    const rows = sortRows(data.topQuestions, sort.sortBy, sort.sortDir);
    return { table, ...paginateOchpStats(rows, page, pageSize) };
  }
  const rows = sortRows(data.staff, sort.sortBy, sort.sortDir);
  return { table, ...paginateOchpStats(rows, page, pageSize) };
}

interface RatingPlayer {
  id: number;
  name: string;
  surname: string;
}

interface TournamentStaff {
  orgcommittee: RatingPlayer[];
  editors: RatingPlayer[];
  gameJury: RatingPlayer[];
  appealJury: RatingPlayer[];
}

interface SeasonPlayerAppearance {
  playerId: number;
  name: string;
  questionsTotal: number;
}

function playerLabel(p: RatingPlayer): string {
  return `${p.name} ${p.surname}`.trim();
}

function playerAppearancesFromResults(
  teams: RatingResultRow[],
): SeasonPlayerAppearance[] {
  const out: SeasonPlayerAppearance[] = [];
  for (const r of teams) {
    const score = r.questionsTotal ?? 0;
    for (const m of r.teamMembers ?? []) {
      out.push({
        playerId: m.player.id,
        name: playerLabel(m.player),
        questionsTotal: score,
      });
    }
  }
  return out;
}

function staffFromTournamentMeta(meta: {
  orgcommittee?: RatingPlayer[];
  editors?: RatingPlayer[];
  gameJury?: RatingPlayer[];
  appealJury?: RatingPlayer[];
}): TournamentStaff {
  return {
    orgcommittee: meta.orgcommittee ?? [],
    editors: meta.editors ?? [],
    gameJury: meta.gameJury ?? [],
    appealJury: meta.appealJury ?? [],
  };
}

function topNIncludingCount(
  items: OchpPlayerCountRow[],
  n: number,
  includeCount: number,
): OchpPlayerCountRow[] {
  const sorted = [...items].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"),
  );
  const chosen = new Map<number, OchpPlayerCountRow>();
  for (let i = 0; i < Math.min(n, sorted.length); i++) {
    chosen.set(sorted[i]!.playerId, sorted[i]!);
  }
  for (const item of sorted) {
    if (item.count === includeCount) {
      chosen.set(item.playerId, item);
    }
  }
  return [...chosen.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"),
  );
}

function aggregatePlayerStats(appearancesBySeason: SeasonPlayerAppearance[][]): {
  topParticipations: OchpPlayerCountRow[];
  topQuestions: OchpPlayerCountRow[];
} {
  const map = new Map<
    number,
    { name: string; participations: number; questionsTotal: number }
  >();

  for (const season of appearancesBySeason) {
    for (const a of season) {
      let row = map.get(a.playerId);
      if (!row) {
        row = { name: a.name, participations: 0, questionsTotal: 0 };
        map.set(a.playerId, row);
      } else {
        row.name = a.name;
      }
      row.participations += 1;
      row.questionsTotal += a.questionsTotal;
    }
  }

  const allParticipations = [...map.entries()].map(([playerId, r]) => ({
    playerId,
    name: r.name,
    count: r.participations,
  }));

  const allQuestions = [...map.entries()].map(([playerId, r]) => ({
    playerId,
    name: r.name,
    count: r.questionsTotal,
  }));

  const topParticipations = topNIncludingCount(
    allParticipations,
    OCHP_STATS_TOP_N,
    OCHP_PARTICIPATION_INCLUDE_COUNT,
  );

  const topQuestions = topNIncludingCount(
    allQuestions,
    OCHP_STATS_TOP_N,
    OCHP_QUESTIONS_INCLUDE_COUNT,
  );

  return { topParticipations, topQuestions };
}

function aggregateStaff(staffBySeason: TournamentStaff[]): OchpStaffRow[] {
  const map = new Map<
    number,
    {
      name: string;
      orgcommittee: number;
      editor: number;
      gameJury: number;
      appealJury: number;
    }
  >();

  const bump = (
    people: RatingPlayer[],
    field: "orgcommittee" | "editor" | "gameJury" | "appealJury",
  ) => {
    for (const p of people) {
      let row = map.get(p.id);
      if (!row) {
        row = {
          name: playerLabel(p),
          orgcommittee: 0,
          editor: 0,
          gameJury: 0,
          appealJury: 0,
        };
        map.set(p.id, row);
      } else {
        row.name = playerLabel(p);
      }
      row[field] += 1;
    }
  };

  for (const staff of staffBySeason) {
    bump(staff.orgcommittee, "orgcommittee");
    bump(staff.editors, "editor");
    bump(staff.gameJury, "gameJury");
    bump(staff.appealJury, "appealJury");
  }

  return [...map.entries()]
    .map(([playerId, r]) => ({
      playerId,
      ...r,
      total: r.orgcommittee + r.editor + r.gameJury + r.appealJury,
    }))
    .sort(
      (a, b) =>
        b.total - a.total || a.name.localeCompare(b.name, "ru"),
    );
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
  playerAppearances: SeasonPlayerAppearance[];
  staff: TournamentStaff;
}

const EMPTY_STAFF: TournamentStaff = {
  orgcommittee: [],
  editors: [],
  gameJury: [],
  appealJury: [],
};

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
    return {
      stat: base,
      polishPodium: [],
      playerAppearances: [],
      staff: EMPTY_STAFF,
    };
  }

  const tournamentId = resolveOchpRatingTournamentId(seasonStart);
  base.tournamentId = tournamentId;
  base.resultsHref = `/ochp/results-chgk?season=${seasonStart}`;

  let polishPodium: PolishPodiumEntry[] = [];
  let playerAppearances: SeasonPlayerAppearance[] = [];
  let staff: TournamentStaff = EMPTY_STAFF;

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
        orgcommittee?: RatingPlayer[];
        editors?: RatingPlayer[];
        gameJury?: RatingPlayer[];
        appealJury?: RatingPlayer[];
      };
      if (meta.dateStart && meta.dateEnd) {
        base.dateLabel = formatOchpTournamentDateRange(
          meta.dateStart,
          meta.dateEnd,
        );
      }
      staff = staffFromTournamentMeta(meta);
    }

    if (!resultsRes.ok) {
      return { stat: base, polishPodium, playerAppearances, staff };
    }

    const results = (await resultsRes.json()) as RatingResultRow[];
    const teams = results.filter((r) => r.position !== 9999);
    base.teamCount = teams.length;
    playerAppearances = playerAppearancesFromResults(teams);

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

  return { stat: base, polishPodium, playerAppearances, staff };
}

export async function fetchOchpStatsPageData(): Promise<OchpStatsPageData> {
  const seasons = [...ochpSeasonOptions()].reverse();
  const fetched = await Promise.all(seasons.map((s) => fetchSeasonData(s)));
  const { teams, players } = aggregatePodiums(
    fetched.map((f) => f.polishPodium),
  );
  const { topParticipations, topQuestions } = aggregatePlayerStats(
    fetched.map((f) => f.playerAppearances),
  );
  const staff = aggregateStaff(fetched.map((f) => f.staff));
  return {
    seasons: fetched.map((f) => f.stat),
    teamPodium: teams,
    playerPodium: players,
    topParticipations,
    topQuestions,
    staff,
  };
}

export async function fetchOchpAllSeasonStats(): Promise<OchpSeasonStatRow[]> {
  const data = await fetchOchpStatsPageData();
  return data.seasons;
}

export function ochpSeasonRatingUrl(tournamentId: number): string {
  return ochpRatingPublicUrl(tournamentId);
}
