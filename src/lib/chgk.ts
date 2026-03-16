const BASE = "https://api.rating.chgk.info";

export interface ChgkPlayer {
  id: number;
  name: string;
  patronymic: string;
  surname: string;
  gotQuestionsTag: number | null;
}

export interface ChgkTeam {
  id: number;
  name: string;
  town?: { id: number; name: string; country?: { id: number; name: string } };
}

export interface ChgkSeasonEntry {
  idplayer: number;
  idseason: number;
  idteam: number;
  dateAdded: string;
}

export interface ChgkTournamentEntry {
  idplayer: number;
  idteam: number;
  idtournament: number;
}

export async function fetchPlayer(id: number): Promise<ChgkPlayer | null> {
  try {
    const res = await fetch(`${BASE}/players/${id}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchTeam(id: number): Promise<ChgkTeam | null> {
  try {
    const res = await fetch(`${BASE}/teams/${id}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchPlayerSeasons(playerId: number): Promise<ChgkSeasonEntry[]> {
  try {
    const res = await fetch(`${BASE}/players/${playerId}/seasons.json`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchPlayerTournaments(playerId: number): Promise<ChgkTournamentEntry[]> {
  try {
    const res = await fetch(`${BASE}/players/${playerId}/tournaments.json`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
