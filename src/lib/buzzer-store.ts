interface Player {
  id: string;
  name: string;
}

interface BuzzEntry {
  playerId: string;
  playerName: string;
  timestamp: number;
  position: number;
}

interface Game {
  code: string;
  adminToken: string;
  status: "closed" | "open";
  players: Map<string, Player>;
  buzzes: BuzzEntry[];
  buzzedPlayerIds: Set<string>;
  createdAt: number;
}

export interface GameStateDTO {
  code: string;
  status: "closed" | "open";
  players: { id: string; name: string }[];
  buzzes: {
    playerId: string;
    playerName: string;
    position: number;
  }[];
}

type GameListener = (state: GameStateDTO) => void;

const g = globalThis as unknown as {
  __buzzerGames?: Map<string, Game>;
  __buzzerListeners?: Map<string, Set<GameListener>>;
};
if (!g.__buzzerGames) g.__buzzerGames = new Map();
if (!g.__buzzerListeners) g.__buzzerListeners = new Map();

const games = g.__buzzerGames;
const gameListeners = g.__buzzerListeners;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  do {
    code = "";
    for (let i = 0; i < 6; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
  } while (games.has(code));
  return code;
}

function toDTO(game: Game): GameStateDTO {
  return {
    code: game.code,
    status: game.status,
    players: Array.from(game.players.values()),
    buzzes: game.buzzes.map((b) => ({
      playerId: b.playerId,
      playerName: b.playerName,
      position: b.position,
    })),
  };
}

function broadcast(code: string) {
  const game = games.get(code);
  const ls = gameListeners.get(code);
  if (!game || !ls) return;
  const state = toDTO(game);
  for (const l of ls) {
    try {
      l(state);
    } catch {}
  }
}

export function createGame(): { code: string; adminToken: string } {
  const code = generateCode();
  const adminToken = crypto.randomUUID();
  games.set(code, {
    code,
    adminToken,
    status: "closed",
    players: new Map(),
    buzzes: [],
    buzzedPlayerIds: new Set(),
    createdAt: Date.now(),
  });
  return { code, adminToken };
}

export function joinGame(
  code: string,
  name: string,
): { playerId: string } | null {
  const game = games.get(code);
  if (!game) return null;
  const playerId = crypto.randomUUID();
  game.players.set(playerId, { id: playerId, name });
  broadcast(code);
  return { playerId };
}

export function buzz(
  code: string,
  playerId: string,
): { position: number } | null {
  const game = games.get(code);
  if (!game || game.status !== "open") return null;
  if (game.buzzedPlayerIds.has(playerId)) return null;
  const player = game.players.get(playerId);
  if (!player) return null;

  const position = game.buzzes.length + 1;
  game.buzzes.push({
    playerId,
    playerName: player.name,
    timestamp: Date.now(),
    position,
  });
  game.buzzedPlayerIds.add(playerId);
  broadcast(code);
  return { position };
}

export function adminAction(
  code: string,
  adminToken: string,
  action: "open" | "close" | "clear",
): boolean {
  const game = games.get(code);
  if (!game || game.adminToken !== adminToken) return false;

  switch (action) {
    case "open":
      game.status = "open";
      game.buzzes = [];
      game.buzzedPlayerIds.clear();
      break;
    case "close":
      game.status = "closed";
      break;
    case "clear":
      game.buzzes = [];
      game.buzzedPlayerIds.clear();
      break;
  }

  broadcast(code);
  return true;
}

export function removePlayer(
  code: string,
  adminToken: string,
  playerId: string,
): boolean {
  const game = games.get(code);
  if (!game || game.adminToken !== adminToken) return false;
  game.players.delete(playerId);
  game.buzzedPlayerIds.delete(playerId);
  game.buzzes = game.buzzes.filter((b) => b.playerId !== playerId);
  game.buzzes.forEach((b, i) => (b.position = i + 1));
  broadcast(code);
  return true;
}

export function isValidAdmin(code: string, adminToken: string): boolean {
  const game = games.get(code);
  return !!game && game.adminToken === adminToken;
}

export function isValidPlayer(code: string, playerId: string): boolean {
  const game = games.get(code);
  return !!game && game.players.has(playerId);
}

export function gameExists(code: string): boolean {
  return games.has(code);
}

export function getGameState(code: string): GameStateDTO | null {
  const game = games.get(code);
  return game ? toDTO(game) : null;
}

export function subscribe(code: string, listener: GameListener): () => void {
  if (!gameListeners.has(code)) gameListeners.set(code, new Set());
  gameListeners.get(code)!.add(listener);
  return () => {
    gameListeners.get(code)?.delete(listener);
  };
}

setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [code, game] of games) {
    if (game.createdAt < cutoff) {
      games.delete(code);
      gameListeners.delete(code);
    }
  }
}, 60 * 60 * 1000);
