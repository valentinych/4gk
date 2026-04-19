import { NextResponse } from "next/server";

const BASE = "https://api.rating.chgk.info";

interface TournamentEntry {
  idplayer: number;
  idteam: number;
  idtournament: number;
}

interface TournamentInfo {
  id: number;
  name: string;
  dateStart: string;
  dateEnd: string;
  /** Map of tour index → number of questions, e.g. { "1": 15, "2": 15 } */
  questionQty?: Record<string, number>;
  type?: { id: number; name: string; shortName: string };
}

interface TeamResult {
  team: { id: number; name: string; town?: { id: number; name: string } };
  questionsTotal: number | null;
  position: number;
}

export interface RecentGame {
  tournamentId: number;
  tournamentName: string;
  date: string;
  teamId: number;
  teamName: string;
  position: number | null;
  questionsTotal: number | null;
  questionsMax: number | null;
  totalTeams: number;
  ratingDelta: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse the optional delta token embedded in a chgk.gg cell text.
 *  Handles "+72", "−10" (Russian minus), "-10". */
function parseDelta(text: string): number | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/[+\-−]\s*(\d+)\s*$/);
  if (!match) return null;
  const sign = match[0].trim().startsWith("+") ? 1 : -1;
  return sign * parseInt(match[1], 10);
}

/** Convert ISO date string like "2026-04-09T14:00:00+03:00" to "YYYY-MM-DD". */
function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Convert DD.MM.YYYY (chgk.gg format) to YYYY-MM-DD. */
function ddmmyyyyToKey(s: string): string {
  const [d, m, y] = s.split(".");
  return `${y}-${m}-${d}`;
}

interface GgTournamentRow {
  name: string;     // tournament name as shown on chgk.gg (for matching)
  d: number | null;
}

/**
 * Scrape rating.chgk.gg team page for tournament rows containing delta D.
 * IMPORTANT: the date shown on chgk.gg is the *release* date, not the play
 * date, so we match by tournament name rather than by date.
 * Returns a name→row map (lowercased key).
 */
async function fetchChgkGgTeamDeltas(
  teamId: number,
): Promise<Map<string, GgTournamentRow>> {
  const map = new Map<string, GgTournamentRow>();
  try {
    const res = await fetch(`https://rating.chgk.gg/b/team/${teamId}/`, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "4gk.pl/1.0 (+https://4gk.pl)" },
    });
    if (!res.ok) return map;
    const html = await res.text();

    const rowRegex =
      /<tr[^>]*class="[^"]*rating-table-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const cells: string[] = [];
      let cm: RegExpExecArray | null;
      while ((cm = cellRegex.exec(rowHtml)) !== null) {
        cells.push(
          cm[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim(),
        );
      }

      // Tournament rows: [releaseDate, position, score+delta, tournamentName, ...]
      // Release-only rows: tournamentName cell is empty — skip those
      if (cells.length < 4) continue;
      const tournamentName = cells[3]?.trim() ?? "";
      if (!tournamentName) continue;

      map.set(tournamentName.toLowerCase(), {
        name: tournamentName,
        d: parseDelta(cells[2]),
      });
    }
  } catch {
    // silently ignore — delta will be null for all tournaments of this team
  }
  return map;
}

/** Look up the D delta for a tournament by name (case-insensitive). */
function findDelta(
  map: Map<string, GgTournamentRow>,
  name: string,
): number | null {
  return map.get(name.toLowerCase())?.d ?? null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chgkId = searchParams.get("chgkId");

  if (!chgkId) {
    return NextResponse.json({ error: "chgkId is required" }, { status: 400 });
  }

  try {
    // 1. Fetch the complete list of tournaments this player participated in.
    //    The endpoint returns only {idplayer, idteam, idtournament} – no dates.
    const tournamentsRes = await fetch(
      `${BASE}/players/${chgkId}/tournaments`,
      { next: { revalidate: 3600 } },
    );
    if (!tournamentsRes.ok) return NextResponse.json({ games: [] });

    const allTournaments: TournamentEntry[] = await tournamentsRes.json();
    if (!allTournaments.length) return NextResponse.json({ games: [] });

    // 2. Take the 100 highest IDs as candidates (IDs are roughly chronological,
    //    so this pool reliably covers every recently-played tournament).
    const candidates = [...allTournaments]
      .sort((a, b) => b.idtournament - a.idtournament)
      .slice(0, 100);

    // 3. Fetch actual tournament info in parallel for all 100 candidates.
    //    Results are cached by Next.js, so re-visits are fast.
    const infoMap = new Map<number, TournamentInfo>();
    await Promise.all(
      candidates.map(async (entry) => {
        try {
          const res = await fetch(`${BASE}/tournaments/${entry.idtournament}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) infoMap.set(entry.idtournament, await res.json());
        } catch {
          // skip missing/errored tournaments
        }
      }),
    );

    // 4. Sort ALL candidates by actual play date (dateStart), pick the 5 most recent.
    const sorted = candidates
      .filter((e) => infoMap.has(e.idtournament))
      .sort((a, b) => {
        const da = infoMap.get(a.idtournament)!.dateStart;
        const db = infoMap.get(b.idtournament)!.dateStart;
        return new Date(db).getTime() - new Date(da).getTime();
      });
    const recent = sorted.slice(0, 5);

    // 5. For each unique team used in recent games, fetch chgk.gg delta map
    const uniqueTeamIds = [...new Set(recent.map((e) => e.idteam))];
    const deltaByTeam = new Map<number, Map<string, GgTournamentRow>>();
    await Promise.all(
      uniqueTeamIds.map(async (teamId) => {
        deltaByTeam.set(teamId, await fetchChgkGgTeamDeltas(teamId));
      }),
    );

    // 6. Fetch tournament results in parallel for the 5 recent games
    const games: RecentGame[] = await Promise.all(
      recent.map(async (entry) => {
        const info = infoMap.get(entry.idtournament)!;

        const resultsRes = await fetch(
          `${BASE}/tournaments/${entry.idtournament}/results?includeTeamMembers=0`,
          { next: { revalidate: 3600 } },
        );
        let results: TeamResult[] = [];
        if (resultsRes.ok) results = await resultsRes.json();

        const teamResult = results.find((r) => r.team.id === entry.idteam);
        const validResults = results.filter(
          (r) => r.position !== 9999 && r.questionsTotal !== null,
        );

        // Total questions = sum of questionQty values
        const questionsMax = info.questionQty
          ? Object.values(info.questionQty).reduce((s, v) => s + v, 0)
          : null;

        // Rating delta from chgk.gg — match by tournament name
        const ggMap = deltaByTeam.get(entry.idteam) ?? new Map();
        const ratingDelta = findDelta(ggMap, info.name);

        return {
          tournamentId: entry.idtournament,
          tournamentName: info.name,
          date: info.dateStart,
          teamId: entry.idteam,
          teamName: teamResult?.team.name ?? `Команда #${entry.idteam}`,
          position:
            teamResult && teamResult.position !== 9999
              ? teamResult.position
              : null,
          questionsTotal: teamResult?.questionsTotal ?? null,
          questionsMax,
          totalTeams: validResults.length || results.length,
          ratingDelta,
        };
      }),
    );

    // Return in reverse-chronological order (newest first)
    games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ games: [] });
  }
}
