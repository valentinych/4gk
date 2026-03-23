import type { ParsedTrack, MusicThemeData } from "./gdrive";

interface Player {
  id: string;
  name: string;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
}

interface BuzzEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  trackTimeMs: number;
  timestamp: number;
}

export interface MusicScoreEntry {
  themeIndex: number;
  trackIndex: number;
  playerId: string;
  playerName: string;
  teamId: string;
  result: "+" | "-";
  value: number;
}

export type MusicPhase =
  | "lobby"
  | "theme-intro"
  | "playing"
  | "buzzed"
  | "idle";

interface MusicGame {
  code: string;
  adminToken: string;
  phase: MusicPhase;
  themes: MusicThemeData[];
  currentTheme: number;
  currentTrack: number;
  trackResumeAt: number;
  buzzTrackTimeMs: number | null;
  answerDeadlineTs: number | null;
  teams: Map<string, Team>;
  players: Map<string, Player>;
  buzzes: BuzzEntry[];
  buzzedPlayerIds: Set<string>;
  teamScores: Map<string, number>;
  scoreLog: MusicScoreEntry[];
  halfMinus: boolean;
  createdAt: number;
}

export interface MusicGameStateDTO {
  code: string;
  phase: MusicPhase;
  hasRound: boolean;
  currentTheme: number;
  currentTrack: number;
  totalThemes: number;
  themeNames: string[];
  trackCounts: number[];
  trackValues: number[][];

  currentThemeName: string | null;
  currentValue: number | null;
  audioUrl: string | null;
  trackInfo: {
    artists: string;
    songName: string;
    style: string;
    year: number;
  } | null;

  trackResumeAt: number;
  buzzTrackTimeMs: number | null;
  answerDeadlineTs: number | null;

  teams: { id: string; name: string; players: { id: string; name: string }[] }[];
  buzzes: {
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    trackTimeMs: number;
  }[];

  teamScores: Record<string, number>;
  scoreLog: MusicScoreEntry[];
  halfMinus: boolean;
}

export interface MusicRoomStatusDTO {
  exists: boolean;
  playerCount: number;
  teamCount: number;
  phase: MusicPhase;
  hasRound: boolean;
}

type Listener = (state: MusicGameStateDTO) => void;

const g = globalThis as unknown as {
  __musicGames?: Map<string, MusicGame>;
  __musicListeners?: Map<string, Set<Listener>>;
};
if (!g.__musicGames) g.__musicGames = new Map();
if (!g.__musicListeners) g.__musicListeners = new Map();

const games = g.__musicGames;
const listeners = g.__musicListeners;

const ANSWER_SECONDS = 7;

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  do {
    code = "";
    for (let i = 0; i < 6; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
  } while (games.has(code));
  return code;
}

function getCurrentTrack(game: MusicGame): ParsedTrack | null {
  const theme = game.themes[game.currentTheme];
  return theme?.tracks[game.currentTrack] ?? null;
}

function toDTO(game: MusicGame): MusicGameStateDTO {
  const track = getCurrentTrack(game);
  const theme = game.themes[game.currentTheme] ?? null;

  const teamList = Array.from(game.teams.values()).map((t) => ({
    id: t.id,
    name: t.name,
    players: Array.from(game.players.values())
      .filter((p) => p.teamId === t.id)
      .map((p) => ({ id: p.id, name: p.name })),
  }));

  return {
    code: game.code,
    phase: game.phase,
    hasRound: game.themes.length > 0,
    currentTheme: game.currentTheme,
    currentTrack: game.currentTrack,
    totalThemes: game.themes.length,
    themeNames: game.themes.map((t) => t.name),
    trackCounts: game.themes.map((t) => t.tracks.length),
    trackValues: game.themes.map((t) => t.tracks.map((tr) => tr.value)),

    currentThemeName: theme?.name ?? null,
    currentValue: track?.value ?? null,
    audioUrl: track?.audioUrl ?? null,
    trackInfo: track
      ? {
          artists: track.artists,
          songName: track.songName,
          style: track.style,
          year: track.year,
        }
      : null,

    trackResumeAt: game.trackResumeAt,
    buzzTrackTimeMs: game.buzzTrackTimeMs,
    answerDeadlineTs: game.answerDeadlineTs,

    teams: teamList,
    buzzes: game.buzzes.map((b) => ({
      playerId: b.playerId,
      playerName: b.playerName,
      teamId: b.teamId,
      teamName: b.teamName,
      trackTimeMs: b.trackTimeMs,
    })),

    teamScores: Object.fromEntries(game.teamScores),
    scoreLog: [...game.scoreLog],
    halfMinus: game.halfMinus,
  };
}

function broadcast(code: string) {
  const game = games.get(code);
  const ls = listeners.get(code);
  if (!game || !ls) return;
  const state = toDTO(game);
  for (const l of ls) {
    try {
      l(state);
    } catch {}
  }
}

function recalcScores(game: MusicGame) {
  game.teamScores.clear();
  for (const e of game.scoreLog) {
    const cur = game.teamScores.get(e.teamId) || 0;
    game.teamScores.set(
      e.teamId,
      cur + (e.result === "+" ? e.value : -e.value),
    );
  }
}

export function createMusicGame(): { code: string; adminToken: string } {
  const code = genCode();
  const adminToken = crypto.randomUUID();
  games.set(code, {
    code,
    adminToken,
    phase: "lobby",
    themes: [],
    currentTheme: 0,
    currentTrack: 0,
    trackResumeAt: 0,
    buzzTrackTimeMs: null,
    answerDeadlineTs: null,
    teams: new Map(),
    players: new Map(),
    buzzes: [],
    buzzedPlayerIds: new Set(),
    teamScores: new Map(),
    scoreLog: [],
    halfMinus: false,
    createdAt: Date.now(),
  });
  return { code, adminToken };
}

export function addTeam(
  code: string,
  adminToken: string,
  teamName: string,
): string | null {
  const game = games.get(code);
  if (!game || game.adminToken !== adminToken) return null;
  const id = crypto.randomUUID().slice(0, 8);
  game.teams.set(id, { id, name: teamName });
  broadcast(code);
  return id;
}

export function removeTeam(
  code: string,
  adminToken: string,
  teamId: string,
): boolean {
  const game = games.get(code);
  if (!game || game.adminToken !== adminToken) return false;
  game.teams.delete(teamId);
  for (const [pid, p] of game.players) {
    if (p.teamId === teamId) game.players.delete(pid);
  }
  broadcast(code);
  return true;
}

export function joinMusicGame(
  code: string,
  name: string,
  teamId: string,
): { playerId: string } | null {
  const game = games.get(code);
  if (!game || !game.teams.has(teamId)) return null;
  const playerId = crypto.randomUUID();
  game.players.set(playerId, { id: playerId, name, teamId });
  broadcast(code);
  return { playerId };
}

export function musicBuzz(
  code: string,
  playerId: string,
  trackTimeMs: number,
): boolean {
  const game = games.get(code);
  if (!game || game.phase !== "playing") return false;
  if (game.buzzedPlayerIds.has(playerId)) return false;
  const player = game.players.get(playerId);
  if (!player) return false;
  const team = game.teams.get(player.teamId);
  if (!team) return false;

  game.buzzes.push({
    playerId,
    playerName: player.name,
    teamId: team.id,
    teamName: team.name,
    trackTimeMs,
    timestamp: Date.now(),
  });
  game.buzzedPlayerIds.add(playerId);
  game.buzzTrackTimeMs = trackTimeMs;
  game.answerDeadlineTs = Date.now() + ANSWER_SECONDS * 1000;
  game.phase = "buzzed";
  broadcast(code);
  return true;
}

export function musicAdminAction(
  code: string,
  adminToken: string,
  action: string,
  payload?: Record<string, unknown>,
): boolean {
  const game = games.get(code);
  if (!game || game.adminToken !== adminToken) return false;

  switch (action) {
    case "load-round": {
      const themes = payload?.themes as MusicThemeData[] | undefined;
      if (!themes?.length) return false;
      game.themes = themes;
      game.currentTheme = 0;
      game.currentTrack = 0;
      game.trackResumeAt = 0;
      game.phase = "theme-intro";
      game.buzzes = [];
      game.buzzedPlayerIds.clear();
      break;
    }

    case "next": {
      if (game.themes.length === 0) return false;
      const theme = game.themes[game.currentTheme];
      if (!theme) return false;

      if (game.phase === "theme-intro") {
        game.currentTrack = 0;
        game.trackResumeAt = 0;
        game.buzzes = [];
        game.buzzedPlayerIds.clear();
        game.buzzTrackTimeMs = null;
        game.answerDeadlineTs = null;
        game.phase = "playing";
        break;
      }

      if (game.currentTrack < theme.tracks.length - 1) {
        game.currentTrack++;
        game.trackResumeAt = 0;
        game.buzzes = [];
        game.buzzedPlayerIds.clear();
        game.buzzTrackTimeMs = null;
        game.answerDeadlineTs = null;
        game.phase = "playing";
      } else if (game.currentTheme < game.themes.length - 1) {
        game.currentTheme++;
        game.currentTrack = 0;
        game.trackResumeAt = 0;
        game.buzzes = [];
        game.buzzedPlayerIds.clear();
        game.buzzTrackTimeMs = null;
        game.answerDeadlineTs = null;
        game.phase = "theme-intro";
      } else {
        game.phase = "idle";
      }
      break;
    }

    case "prev": {
      if (game.themes.length === 0) return false;
      if (game.currentTrack > 0) {
        game.currentTrack--;
      } else if (game.currentTheme > 0) {
        game.currentTheme--;
        const prev = game.themes[game.currentTheme];
        game.currentTrack = prev ? prev.tracks.length - 1 : 0;
      }
      game.trackResumeAt = 0;
      game.buzzes = [];
      game.buzzedPlayerIds.clear();
      game.buzzTrackTimeMs = null;
      game.answerDeadlineTs = null;
      game.phase = "playing";
      break;
    }

    case "plus": {
      if (game.phase !== "buzzed" || game.buzzes.length === 0) return false;
      const lastBuzz = game.buzzes[game.buzzes.length - 1];
      const track = getCurrentTrack(game);
      if (track) {
        const player = game.players.get(lastBuzz.playerId);
        game.scoreLog.push({
          themeIndex: game.currentTheme,
          trackIndex: game.currentTrack,
          playerId: lastBuzz.playerId,
          playerName: lastBuzz.playerName,
          teamId: lastBuzz.teamId,
          result: "+",
          value: track.value,
        });
        recalcScores(game);
      }
      game.phase = "idle";
      game.answerDeadlineTs = null;
      break;
    }

    case "minus": {
      if (game.phase !== "buzzed" || game.buzzes.length === 0) return false;
      const lastBuzz = game.buzzes[game.buzzes.length - 1];
      const track = getCurrentTrack(game);
      if (track) {
        const penaltyValue = game.halfMinus ? track.value / 2 : track.value;
        game.scoreLog.push({
          themeIndex: game.currentTheme,
          trackIndex: game.currentTrack,
          playerId: lastBuzz.playerId,
          playerName: lastBuzz.playerName,
          teamId: lastBuzz.teamId,
          result: "-",
          value: penaltyValue,
        });
        recalcScores(game);
      }
      game.trackResumeAt = Math.max(
        0,
        (game.buzzTrackTimeMs ?? 0) - 2000,
      );
      game.buzzTrackTimeMs = null;
      game.answerDeadlineTs = null;
      game.phase = "playing";
      break;
    }

    case "dismiss": {
      if (game.phase !== "buzzed") return false;
      game.trackResumeAt = Math.max(
        0,
        (game.buzzTrackTimeMs ?? 0) - 2000,
      );
      game.buzzTrackTimeMs = null;
      game.answerDeadlineTs = null;
      game.phase = "playing";
      break;
    }

    case "score-edit": {
      const ti = Number(payload?.themeIndex ?? -1);
      const qi = Number(payload?.trackIndex ?? -1);
      const pid = payload?.playerId as string;
      const result = (payload?.result as "+" | "-" | null) ?? null;
      if (ti < 0 || qi < 0 || !pid) return false;
      game.scoreLog = game.scoreLog.filter(
        (e) =>
          !(
            e.themeIndex === ti &&
            e.trackIndex === qi &&
            e.playerId === pid
          ),
      );
      if (result) {
        const track = game.themes[ti]?.tracks[qi];
        if (!track) return false;
        const player = game.players.get(pid);
        if (!player) return false;
        const team = game.teams.get(player.teamId);
        if (!team) return false;
        const penaltyValue =
          result === "-" && game.halfMinus ? track.value / 2 : track.value;
        game.scoreLog.push({
          themeIndex: ti,
          trackIndex: qi,
          playerId: pid,
          playerName: player.name,
          teamId: team.id,
          result,
          value: penaltyValue,
        });
      }
      recalcScores(game);
      break;
    }

    case "set-half-minus": {
      game.halfMinus = !!payload?.enabled;
      break;
    }

    case "track-ended": {
      if (game.phase === "playing") {
        game.phase = "idle";
      }
      break;
    }

    default:
      return false;
  }

  broadcast(code);
  return true;
}

export function removeMusicPlayer(
  code: string,
  adminToken: string,
  playerId: string,
): boolean {
  const game = games.get(code);
  if (!game || game.adminToken !== adminToken) return false;
  game.players.delete(playerId);
  game.buzzedPlayerIds.delete(playerId);
  game.buzzes = game.buzzes.filter((b) => b.playerId !== playerId);
  broadcast(code);
  return true;
}

export function musicGameExists(code: string): boolean {
  return games.has(code);
}

export function getMusicGameState(code: string): MusicGameStateDTO | null {
  const game = games.get(code);
  return game ? toDTO(game) : null;
}

export function getMusicRoomStatus(code: string): MusicRoomStatusDTO | null {
  const game = games.get(code);
  if (!game) return null;
  return {
    exists: true,
    playerCount: game.players.size,
    teamCount: game.teams.size,
    phase: game.phase,
    hasRound: game.themes.length > 0,
  };
}

export function isMusicAdmin(code: string, adminToken: string): boolean {
  const game = games.get(code);
  return !!game && game.adminToken === adminToken;
}

export function subscribeMusicGame(
  code: string,
  listener: Listener,
): () => void {
  if (!listeners.has(code)) listeners.set(code, new Set());
  listeners.get(code)!.add(listener);
  return () => {
    listeners.get(code)?.delete(listener);
  };
}

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, game] of games) {
    if (game.createdAt < cutoff) {
      games.delete(code);
      listeners.delete(code);
    }
  }
}, 5 * 60 * 1000);
