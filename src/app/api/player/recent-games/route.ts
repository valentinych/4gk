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
  totalTeams: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chgkId = searchParams.get("chgkId");

  if (!chgkId) {
    return NextResponse.json({ error: "chgkId is required" }, { status: 400 });
  }

  try {
    const tournamentsRes = await fetch(
      `${BASE}/players/${chgkId}/tournaments`,
      { next: { revalidate: 3600 } }
    );
    if (!tournamentsRes.ok) {
      return NextResponse.json({ games: [] });
    }
    const tournaments: TournamentEntry[] = await tournamentsRes.json();

    if (!tournaments.length) {
      return NextResponse.json({ games: [] });
    }

    tournaments.sort((a, b) => b.idtournament - a.idtournament);
    const recent = tournaments.slice(0, 5);

    const games: RecentGame[] = await Promise.all(
      recent.map(async (entry) => {
        const [infoRes, resultsRes] = await Promise.all([
          fetch(`${BASE}/tournaments/${entry.idtournament}`, {
            next: { revalidate: 3600 },
          }),
          fetch(
            `${BASE}/tournaments/${entry.idtournament}/results?includeTeamMembers=0`,
            { next: { revalidate: 3600 } }
          ),
        ]);

        let info: TournamentInfo | null = null;
        let results: TeamResult[] = [];

        if (infoRes.ok) info = await infoRes.json();
        if (resultsRes.ok) results = await resultsRes.json();

        const teamResult = results.find((r) => r.team.id === entry.idteam);
        const validResults = results.filter(
          (r) => r.position !== 9999 && r.questionsTotal !== null
        );

        return {
          tournamentId: entry.idtournament,
          tournamentName: info?.name ?? `Турнир #${entry.idtournament}`,
          date: info?.dateStart ?? "",
          teamId: entry.idteam,
          teamName: teamResult?.team.name ?? `Команда #${entry.idteam}`,
          position:
            teamResult && teamResult.position !== 9999
              ? teamResult.position
              : null,
          questionsTotal: teamResult?.questionsTotal ?? null,
          totalTeams: validResults.length || results.length,
        };
      })
    );

    games.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ games: [] });
  }
}
