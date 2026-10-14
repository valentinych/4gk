const BASE = "https://micromatches.com";

interface ApiStageResult {
  team_id: number;
  points: number;
  place: number;
}

interface ApiStage {
  name: string;
  results?: ApiStageResult[];
  stage_number: number;
  results_released?: boolean;
}

interface ApiDivision {
  id: number;
  name: string;
  order: number;
}

interface ApiMicromatch {
  wins: number;
  draws: number;
  losses: number;
}

interface ApiStandingRow {
  micromatches?: Record<string, ApiMicromatch>;
  wins: number;
  team_id: number;
  team_name: string;
  draws: number;
  losses: number;
  stages_points?: number[];
  points: number;
  place: number;
}

interface ApiDivisionStanding {
  division_id: number;
  standings?: ApiStandingRow[];
}

interface ApiTeam {
  id: number;
  name: string;
}

interface ApiTournament {
  stages?: ApiStage[];
  teams?: ApiTeam[];
  divisions?: ApiDivision[];
  generated_at?: string;
  standings?: {
    divisions?: ApiDivisionStanding[];
  };
}

export interface MatchStage {
  name: string;
  team1Score: number;
  team2Score: number;
  winner: "team1" | "team2" | "draw";
}

export interface MatchDetail {
  team1Name: string;
  team2Name: string;
  stages: MatchStage[];
}

export interface ParsedTeam {
  id: number;
  name: string;
  pts: number;
  w: number;
  d: number;
  l: number;
  results: (string | null)[];
}

export interface ParsedLeague {
  name: string;
  teams: ParsedTeam[];
  teamOrder: number[];
}

/** One row of the season-wide cross-table. `results` lines up with `overall.teamOrder`. */
export interface OverallTeam extends ParsedTeam {
  league: string;
}

export interface ParsedTour {
  name: string;
  winners: string;
  score: number;
}

export interface MicroMatchesData {
  leagues: ParsedLeague[];
  /** Every team, league order then place. Cells include cross-league micromatches. */
  overall: {
    teams: OverallTeam[];
    teamOrder: number[];
  };
  tours: ParsedTour[];
  matchDetails: Record<string, MatchDetail>;
  generatedAt?: string;
}

export async function fetchMicromatchesTournament(slug: string, password?: string): Promise<unknown> {
  const url = new URL(`/api/tournaments/${encodeURIComponent(slug)}`, BASE);
  if (password) url.searchParams.set("password", password);
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`micromatches ${slug}: ${resp.status}`);
  }
  return resp.json();
}

/** Tournament JSON, ignoring `generated_at` (it changes between fetches). */
export function micromatchesPayloadsDiffer(left: unknown, right: unknown): boolean {
  return canonicalTournament(left) !== canonicalTournament(right);
}

export function adaptMicromatchesPayload(data: unknown, slug = "tournament"): MicroMatchesData {
  if (!data || typeof data !== "object") {
    throw new Error(`micromatches ${slug}: unexpected payload`);
  }
  const tournament = data as ApiTournament;
  if (!tournament.standings?.divisions || !Array.isArray(tournament.divisions)) {
    throw new Error(`micromatches ${slug}: unexpected payload`);
  }
  return adaptTournament(tournament);
}

export async function parseMicromatches(slug: string, password?: string): Promise<MicroMatchesData> {
  const data = await fetchMicromatchesTournament(slug, password);
  return adaptMicromatchesPayload(data, slug);
}

function canonicalTournament(value: unknown): string {
  return JSON.stringify(normalizeTournament(value));
}

function normalizeTournament(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeTournament);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (key === "generated_at") continue;
      out[key] = normalizeTournament((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function adaptTournament(data: ApiTournament): MicroMatchesData {
  const divisions = [...(data.divisions ?? [])].sort((a, b) => a.order - b.order);
  const standingByDiv = new Map(
    (data.standings?.divisions ?? []).map((d) => [d.division_id, d.standings ?? []]),
  );
  // stages_points follows this array, so keep payload order.
  const stages = data.stages ?? [];
  const teamNames = new Map<number, string>();
  for (const team of data.teams ?? []) {
    if (typeof team.id === "number" && typeof team.name === "string") teamNames.set(team.id, team.name);
  }

  const rowById = new Map<number, ApiStandingRow>();
  const leagues: ParsedLeague[] = [];
  for (const division of divisions) {
    const rows = (standingByDiv.get(division.id) ?? [])
      .filter(isStandingRow)
      .sort((a, b) => a.place - b.place || a.team_id - b.team_id);
    if (rows.length === 0) continue;

    const teamOrder = rows.map((row) => row.team_id);
    const teams: ParsedTeam[] = rows.map((row) => {
      rowById.set(row.team_id, row);
      if (!teamNames.has(row.team_id)) teamNames.set(row.team_id, row.team_name);
      return {
        id: row.team_id,
        name: row.team_name,
        pts: row.points,
        w: row.wins,
        d: row.draws,
        l: row.losses,
        results: teamOrder.map((opponentId) => cellScore(row, opponentId)),
      };
    });

    leagues.push({
      name: leagueTitle(division.name),
      teams,
      teamOrder,
    });
  }

  const overallOrder = leagues.flatMap((league) => league.teamOrder);
  const overallTeams: OverallTeam[] = leagues.flatMap((league) =>
    league.teamOrder.map((id) => {
      const row = rowById.get(id)!;
      return {
        id: row.team_id,
        name: row.team_name,
        league: league.name,
        pts: row.points,
        w: row.wins,
        d: row.draws,
        l: row.losses,
        results: overallOrder.map((opponentId) => cellScore(row, opponentId)),
      };
    }),
  );

  const tours: ParsedTour[] = [];
  for (const stage of stages) {
    if (stage.results_released === false) continue;
    const winners = (stage.results ?? []).filter(
      (row) => row.place === 1 && typeof row.points === "number" && typeof row.team_id === "number",
    );
    if (winners.length === 0) continue;
    tours.push({
      name: stage.name,
      winners: winners.map((row) => teamNames.get(row.team_id) ?? String(row.team_id)).join(", "),
      score: winners[0].points,
    });
  }

  const pointsByTeam = new Map<number, number[]>();
  for (const rows of standingByDiv.values()) {
    for (const row of rows) {
      if (Array.isArray(row.stages_points)) pointsByTeam.set(row.team_id, row.stages_points);
    }
  }

  const matchDetails: Record<string, MatchDetail> = {};
  for (let i = 0; i < overallTeams.length; i++) {
    for (let j = 0; j < overallTeams.length; j++) {
      if (i === j || overallTeams[i].results[j] == null) continue;
      const stagesForPair = pairStages(
        stages,
        pointsByTeam.get(overallOrder[i]),
        pointsByTeam.get(overallOrder[j]),
      );
      if (!stagesForPair) continue;
      matchDetails[`${overallOrder[i]}-${overallOrder[j]}`] = {
        team1Name: overallTeams[i].name,
        team2Name: overallTeams[j].name,
        stages: stagesForPair,
      };
    }
  }

  return {
    leagues,
    overall: { teams: overallTeams, teamOrder: overallOrder },
    tours,
    matchDetails,
    ...(typeof data.generated_at === "string" ? { generatedAt: data.generated_at } : {}),
  };
}

function isStandingRow(row: ApiStandingRow): boolean {
  return (
    typeof row?.team_id === "number" &&
    typeof row.team_name === "string" &&
    typeof row.points === "number" &&
    typeof row.wins === "number" &&
    typeof row.draws === "number" &&
    typeof row.losses === "number" &&
    typeof row.place === "number"
  );
}

/** Cell text on micromatches is wins:losses. Question-draws stay in the Н column only. */
function cellScore(row: ApiStandingRow, opponentId: number): string | null {
  if (opponentId === row.team_id) return null;
  const mm = row.micromatches?.[String(opponentId)];
  if (!mm || typeof mm.wins !== "number" || typeof mm.losses !== "number") return null;
  return `${mm.wins}:${mm.losses}`;
}

/**
 * Stage i is `stages[i].name` plus both teams' `stages_points[i]`
 * (same as `stages[i].results[].points`, or 0 if that team has no result row).
 * Equal points are a draw: the payload has no per-stage winner.
 * Points stay even when `results_released` is still false — the password
 * payload fills them before that flag flips, and they already count in the cell.
 */
function pairStages(
  stages: ApiStage[],
  left: number[] | undefined,
  right: number[] | undefined,
): MatchStage[] | null {
  if (!left || !right) return null;
  const n = Math.min(stages.length, left.length, right.length);
  const rows: MatchStage[] = [];
  for (let i = 0; i < n; i++) {
    const team1Score = left[i];
    const team2Score = right[i];
    if (typeof team1Score !== "number" || typeof team2Score !== "number") continue;
    rows.push({
      name: typeof stages[i].name === "string" ? stages[i].name : "",
      team1Score,
      team2Score,
      winner: team1Score > team2Score ? "team1" : team2Score > team1Score ? "team2" : "draw",
    });
  }
  return rows.length > 0 ? rows : null;
}

function leagueTitle(name: string): string {
  const trimmed = name.trim();
  if (/^лига\b/i.test(trimmed)) return trimmed;
  return `Лига ${trimmed}`;
}
