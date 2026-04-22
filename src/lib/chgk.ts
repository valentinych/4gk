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

/**
 * Fetches team season entries. The rating.chgk.info endpoint paginates at ~30
 * rows regardless of the `limit` parameter, so without a season filter newer
 * seasons may be missing entirely. Pass `seasonId` to request exactly that
 * season and bypass the pagination issue.
 */
export async function fetchTeamSeasons(
  teamId: number,
  seasonId?: number,
): Promise<ChgkSeasonEntry[]> {
  try {
    const qs = seasonId ? `?idseason=${seasonId}` : `?limit=500`;
    const res = await fetch(`${BASE}/teams/${teamId}/seasons.json${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

let currentSeasonIdCache: { id: number; fetchedAt: number } | null = null;

/** Returns the id of the season whose date range contains "now". */
export async function fetchCurrentSeasonId(): Promise<number | null> {
  const now = Date.now();
  if (currentSeasonIdCache && now - currentSeasonIdCache.fetchedAt < 60 * 60 * 1000) {
    return currentSeasonIdCache.id;
  }
  try {
    const res = await fetch(`${BASE}/seasons.json?limit=500`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const seasons = (Array.isArray(data) ? data : (data.items ?? [])) as {
      id: number;
      dateStart: string;
      dateEnd: string;
    }[];
    const today = new Date();
    const active = seasons.find(
      (s) => new Date(s.dateStart) <= today && today <= new Date(s.dateEnd),
    );
    const id = active?.id ?? Math.max(...seasons.map((s) => s.id));
    if (Number.isFinite(id)) {
      currentSeasonIdCache = { id, fetchedAt: now };
      return id;
    }
    return null;
  } catch {
    return null;
  }
}

/** Returns IDs of players in a team's current-season base roster. */
export async function fetchTeamBasePlayerIds(
  teamId: number,
  seasonId?: number,
): Promise<Set<number>> {
  const resolvedSeason = seasonId ?? (await fetchCurrentSeasonId()) ?? undefined;
  const entries = await fetchTeamSeasons(teamId, resolvedSeason);
  const ids = new Set<number>();
  for (const e of entries) {
    if (!resolvedSeason || e.idseason === resolvedSeason) ids.add(e.idplayer);
  }
  return ids;
}

/**
 * Returns base roster players (current season only). `recentPlayers` is kept
 * in the return shape for API compatibility but is always empty.
 */
export async function fetchTeamRosterInfo(
  teamId: number,
  seasonId?: number,
): Promise<TeamRosterInfo> {
  const resolvedSeason = seasonId ?? (await fetchCurrentSeasonId()) ?? undefined;
  const entries = await fetchTeamSeasons(teamId, resolvedSeason);
  if (!entries.length) return { basePlayers: [], recentPlayers: [] };

  const basePlayerIds = new Set<number>();
  for (const e of entries) {
    if (!resolvedSeason || e.idseason === resolvedSeason) basePlayerIds.add(e.idplayer);
  }

  const baseIds = [...basePlayerIds].slice(0, 25);
  const playerResults = await Promise.all(baseIds.map((id) => fetchPlayer(id)));
  const playerMap = new Map<number, ChgkPlayer>();
  for (const p of playerResults) {
    if (p) playerMap.set(p.id, p);
  }

  return {
    basePlayers: baseIds.map((id) => playerMap.get(id)).filter((p): p is ChgkPlayer => !!p),
    recentPlayers: [],
  };
}

/** Finds the player's most recent base team from their season history. */
export async function fetchPlayerCurrentTeam(
  playerId: number,
): Promise<{ teamId: number; teamName: string; city?: string | null; currentSeasonId: number } | null> {
  const seasons = await fetchPlayerSeasons(playerId);
  if (!seasons.length) return null;
  const sorted = [...seasons].sort((a, b) => b.idseason - a.idseason);
  const team = await fetchTeam(sorted[0].idteam);
  if (!team) return null;
  return {
    teamId: team.id,
    teamName: team.name,
    city: team.town?.name,
    currentSeasonId: sorted[0].idseason,
  };
}
