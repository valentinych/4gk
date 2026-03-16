const BASE = "https://micromatches.com";

interface RawStage {
  stage_name: string;
  stage_number: number;
  team1_points: number;
  team2_points: number;
  result: string;
}

interface RawMatchDetail {
  team1_name: string;
  team2_name: string;
  stages: RawStage[];
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

export interface ParsedTour {
  name: string;
  winners: string;
  score: number;
}

export interface MicroMatchesData {
  leagues: ParsedLeague[];
  tours: ParsedTour[];
  matchDetails: Record<string, MatchDetail>;
}

export async function parseMicromatches(slug: string): Promise<MicroMatchesData> {
  const html = await fetch(`${BASE}/${slug}`).then((r) => r.text());

  const leagues = parseLeagues(html);
  const tours = parseTours(html);

  const matchDetails: Record<string, MatchDetail> = {};
  for (const league of leagues) {
    const ids = league.teamOrder;
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < ids.length; j++) {
        if (i === j) continue;
        if (league.teams[i].results[j] === null) continue;
        const key = `${ids[i]}-${ids[j]}`;
        if (matchDetails[key]) continue;
        try {
          const resp = await fetch(`${BASE}/api/micromatches/${slug}/${ids[i]}/${ids[j]}`);
          if (resp.ok) {
            const raw: RawMatchDetail = await resp.json();
            matchDetails[key] = {
              team1Name: raw.team1_name,
              team2Name: raw.team2_name,
              stages: raw.stages.map((s) => ({
                name: s.stage_name,
                team1Score: s.team1_points,
                team2Score: s.team2_points,
                winner: s.result === "team1_win" ? "team1" : s.result === "team2_win" ? "team2" : "draw",
              })),
            };
          }
        } catch { /* skip failed requests */ }
      }
    }
  }

  return { leagues, tours, matchDetails };
}

function parseLeagues(html: string): ParsedLeague[] {
  const leagues: ParsedLeague[] = [];

  const leaguePattern = /<h2[^>]*>(.*?)<\/h2>\s*<div[^>]*>\s*<table[^>]*>([\s\S]*?)<\/table>/g;
  let leagueMatch;

  while ((leagueMatch = leaguePattern.exec(html)) !== null) {
    const leagueName = leagueMatch[1].replace(/<[^>]*>/g, "").trim();
    const tableHtml = leagueMatch[2];

    const teamOrder: number[] = [];
    const teams: ParsedTeam[] = [];

    const headerPattern = /data-team-name="([^"]*)"[^>]*data-team-index="(\d+)"/g;
    const headerIds: number[] = [];
    let headerMatch;
    while ((headerMatch = headerPattern.exec(tableHtml)) !== null) {
      headerIds.push(parseInt(headerMatch[2]));
    }

    const rowPattern = /<tr\s+data-team-id="(\d+)">([\s\S]*?)<\/tr>/g;
    let rowMatch;

    while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
      const teamId = parseInt(rowMatch[1]);
      const rowHtml = rowMatch[2];
      teamOrder.push(teamId);

      const nameMatch = rowHtml.match(/team-name-cell[^>]*>([^<]*)</);
      const name = nameMatch?.[1]?.trim() ?? "";

      const tdPattern = /<td\s+class="text-center"[^>]*>([\s\S]*?)<\/td>/g;
      const cells: string[] = [];
      let tdMatch;
      while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
        cells.push(tdMatch[1].replace(/<[^>]*>/g, "").trim());
      }

      const pos = parseInt(cells[0] ?? "0");
      const pts = parseInt(cells[1] ?? "0");
      const w = parseInt(cells[2] ?? "0");
      const d = parseInt(cells[3] ?? "0");
      const l = parseInt(cells[4] ?? "0");
      void pos;

      const mmPattern = /micromatch-cell[^>]*>([\s\S]*?)<\/td>/g;
      const diagPattern = /bg-gray-300[^>]*>[^<]*<\/td>/g;
      const allCellsPattern = /(<td[^>]*micromatch-cell[^>]*>[\s\S]*?<\/td>|<td[^>]*bg-gray-300[^>]*>[^<]*<\/td>)/g;

      void mmPattern;
      void diagPattern;

      const results: (string | null)[] = [];
      let cellMatch;
      while ((cellMatch = allCellsPattern.exec(rowHtml)) !== null) {
        const cellHtml = cellMatch[1];
        if (cellHtml.includes("bg-gray-300")) {
          results.push(null);
        } else {
          const scoreMatch = cellHtml.replace(/<[^>]*>/g, "").trim().replace(/\s+/g, "");
          results.push(scoreMatch || null);
        }
      }

      teams.push({ id: teamId, name, pts, w, d, l, results });
    }

    if (teams.length > 0) {
      leagues.push({ name: leagueName, teams, teamOrder });
    }
  }

  return leagues;
}

function parseTours(html: string): ParsedTour[] {
  const tours: ParsedTour[] = [];

  const rowPattern = /stage-name-link[^>]*data-stage-id="(\d+)"[^>]*>([\s\S]*?)<\/button>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;

  let m;
  while ((m = rowPattern.exec(html)) !== null) {
    const name = m[2].replace(/<[^>]*>/g, "").trim();
    const winnersHtml = m[3];
    const scoreHtml = m[4];

    const winners = winnersHtml
      .replace(/<[^>]*>/g, "\n")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");

    const scoreMatch = scoreHtml.replace(/<[^>]*>/g, "").trim();
    const score = parseInt(scoreMatch) || 0;

    if (name) tours.push({ name, winners, score });
  }

  return tours;
}
