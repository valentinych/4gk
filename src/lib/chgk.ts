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
    const res = await fetch(`${BASE}/players/${playerId}/seasons.json?limit=500`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

export async function fetchPlayerTournaments(playerId: number): Promise<ChgkTournamentEntry[]> {
  try {
    const res = await fetch(`${BASE}/players/${playerId}/tournaments.json`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

export interface TeamRosterInfo {
  basePlayers: ChgkPlayer[];
  recentPlayers: ChgkPlayer[];
}

export async function fetchTeamSeasons(teamId: number): Promise<ChgkSeasonEntry[]> {
  try {
    const res = await fetch(`${BASE}/teams/${teamId}/seasons.json?limit=500`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

/** Returns IDs of players in a team's current-season base roster. */
export async function fetchTeamBasePlayerIds(teamId: number): Promise<Set<number>> {
  const entries = await fetchTeamSeasons(teamId);
  const seasons = [...new Set(entries.map((e) => e.idseason))].sort((a, b) => b - a);
  // Only the current (most recent) season
  const currentSeason = new Set(seasons.slice(0, 1));
  const ids = new Set<number>();
  for (const e of entries) {
    if (currentSeason.has(e.idseason)) ids.add(e.idplayer);
  }
  return ids;
}

/**
 * Returns base roster players (current season only) and recent non-base players
 * (previous season only), all with full name data fetched from the rating API.
 */
export async function fetchTeamRosterInfo(teamId: number): Promise<TeamRosterInfo> {
  const entries = await fetchTeamSeasons(teamId);
  if (!entries.length) return { basePlayers: [], recentPlayers: [] };

  const seasons = [...new Set(entries.map((e) => e.idseason))].sort((a, b) => b - a);
  // Current season only — no previous-season suggestions
  const baseSeasonsSet = new Set(seasons.slice(0, 1));
  const recentSeasonsSet = new Set<number>();

  const basePlayerIds = new Set<number>();
  const recentPlayerIds = new Set<number>();

  for (const e of entries) {
    if (baseSeasonsSet.has(e.idseason)) basePlayerIds.add(e.idplayer);
    else if (recentSeasonsSet.has(e.idseason)) recentPlayerIds.add(e.idplayer);
  }
  // Remove from recent if already in base
  for (const id of basePlayerIds) recentPlayerIds.delete(id);

  const baseIds = [...basePlayerIds].slice(0, 25);
  const recentIds = [...recentPlayerIds].slice(0, 25);
  const allIds = [...new Set([...baseIds, ...recentIds])];

  const playerResults = await Promise.all(allIds.map((id) => fetchPlayer(id)));
  const playerMap = new Map<number, ChgkPlayer>();
  for (const p of playerResults) {
    if (p) playerMap.set(p.id, p);
  }

  return {
    basePlayers: baseIds.map((id) => playerMap.get(id)).filter((p): p is ChgkPlayer => !!p),
    recentPlayers: recentIds.map((id) => playerMap.get(id)).filter((p): p is ChgkPlayer => !!p),
  };
}

/** Finds the player's most recent base team from their season history. */
export async function fetchPlayerCurrentTeam(
  playerId: number,
): Promise<{ teamId: number; teamName: string; city?: string | null } | null> {
  const seasons = await fetchPlayerSeasons(playerId);
  if (!seasons.length) return null;
  const sorted = [...seasons].sort((a, b) => b.idseason - a.idseason);
  const team = await fetchTeam(sorted[0].idteam);
  if (!team) return null;
  return { teamId: team.id, teamName: team.name, city: team.town?.name };
}
