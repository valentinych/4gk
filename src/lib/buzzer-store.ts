interface Player {
  id: string;
  name: string;
}

interface BuzzEntry {
  playerId: string;
  playerName: string;
  timestamp: number;
  position: number;
  readingTimeMs: number | null;
  countdownTimeMs: number | null;
}

export interface Handout {
  type: "text" | "image";
  content: string;
}

export interface Question {
  value: number;
  form: string;
  handout?: Handout;
}

export interface Theme {
  name: string;
  questions: Question[];
}

export interface GamePackage {
  title: string;
  themes: Theme[];
}

export type GamePhase = "idle" | "reading" | "countdown" | "buzzed";

export interface ScoreEntry {
  themeIndex: number;
  questionIndex: number;
  playerId: string;
  playerName: string;
  result: "+" | "-";
  value: number;
}

interface Game {
  code: string;
  adminToken: string;
  phase: GamePhase;
  phaseBeforeBuzz: GamePhase | null;
  pkg: GamePackage | null;
  currentTheme: number;
  currentQuestion: number;
  readingStartedAt: number | null;
  countdownStartedAt: number | null;
  readingTimeMs: number | null;
  timerSettings: Record<number, number>;
  halfMinus: boolean;
  players: Map<string, Player>;
  buzzes: BuzzEntry[];
  buzzedPlayerIds: Set<string>;
  scores: Map<string, number>;
  scoreLog: ScoreEntry[];
  createdAt: number;
}

export interface GameStateDTO {
  code: string;
  phase: GamePhase;
  hasPackage: boolean;
  packageTitle: string | null;
  totalThemes: number;
  questionsPerTheme: number;
  currentTheme: number;
  currentQuestion: number;
  currentThemeName: string | null;
  currentValue: number | null;
  questionForm: string | null;
  handout: Handout | null;
  readingStartedAt: number | null;
  countdownStartedAt: number | null;
  countdownDuration: number;
  readingTimeMs: number | null;
  timerSettings: Record<number, number>;
  halfMinus: boolean;
  themeNames: string[];
  questionValues: number[][];
  players: { id: string; name: string }[];
  buzzes: {
    playerId: string;
    playerName: string;
    position: number;
    readingTimeMs: number | null;
    countdownTimeMs: number | null;
  }[];
  scores: Record<string, number>;
  scoreLog: {
    themeIndex: number;
    questionIndex: number;
    playerId: string;
    playerName: string;
    result: "+" | "-";
    value: number;
  }[];
}

export interface RoomStatusDTO {
  exists: boolean;
  playerCount: number;
  phase: GamePhase;
  hasPackage: boolean;
  packageTitle: string | null;
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

const DEFAULT_TIMER: Record<number, number> = {
  10: 5,
  20: 7,
  30: 10,
  40: 12,
  50: 15,
};

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

function getCurrentQuestion(game: Game): Question | null {
  if (!game.pkg) return null;
  const theme = game.pkg.themes[game.currentTheme];
  if (!theme) return null;
  return theme.questions[game.currentQuestion] ?? null;
}

function getCountdownDuration(game: Game): number {
  const q = getCurrentQuestion(game);
  if (!q) return 15;
  return game.timerSettings[q.value] ?? 15;
}

function toDTO(game: Game): GameStateDTO {
  const q = getCurrentQuestion(game);
  const theme = game.pkg?.themes[game.currentTheme] ?? null;

  return {
    code: game.code,
    phase: game.phase,
    hasPackage: !!game.pkg,
    packageTitle: game.pkg?.title ?? null,
    totalThemes: game.pkg?.themes.length ?? 0,
    questionsPerTheme: theme?.questions.length ?? 0,
    currentTheme: game.currentTheme,
    currentQuestion: game.currentQuestion,
    currentThemeName: theme?.name ?? null,
    currentValue: q?.value ?? null,
    questionForm: game.phase === "buzzed" ? (q?.form ?? null) : null,
    handout: game.phase !== "idle" ? (q?.handout ?? null) : null,
    readingStartedAt: game.readingStartedAt,
    countdownStartedAt: game.countdownStartedAt,
    countdownDuration: getCountdownDuration(game),
    readingTimeMs: game.readingTimeMs,
    timerSettings: game.timerSettings,
    halfMinus: game.halfMinus ?? false,
    themeNames: game.pkg?.themes?.map((t) => t.name) ?? [],
    questionValues: game.pkg?.themes?.map((t) => t.questions.map((q) => q.value)) ?? [],
    players: Array.from(game.players.values()),
    buzzes: game.buzzes.map((b) => ({
      playerId: b.playerId,
      playerName: b.playerName,
      position: b.position,
      readingTimeMs: b.readingTimeMs,
      countdownTimeMs: b.countdownTimeMs,
    })),
    scores: game.scores ? Object.fromEntries(game.scores) : {},
    scoreLog: game.scoreLog ? [...game.scoreLog] : [],
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

function recalcScores(game: Game) {
  game.scores.clear();
  for (const e of game.scoreLog) {
    const cur = game.scores.get(e.playerId) || 0;
    game.scores.set(e.playerId, cur + (e.result === "+" ? e.value : -e.value));
  }
}

function resetQuestion(game: Game) {
  game.buzzes = [];
  game.buzzedPlayerIds.clear();
  game.readingStartedAt = Date.now();
  game.countdownStartedAt = null;
  game.readingTimeMs = null;
  game.phase = "reading";
}

export function createGame(): { code: string; adminToken: string } {
  const code = generateCode();
  const adminToken = crypto.randomUUID();
  games.set(code, {
    code,
    adminToken,
    phase: "idle",
    phaseBeforeBuzz: null,
    pkg: null,
    currentTheme: 0,
    currentQuestion: 0,
    readingStartedAt: null,
    countdownStartedAt: null,
    readingTimeMs: null,
    timerSettings: { ...DEFAULT_TIMER },
    halfMinus: false,
    players: new Map(),
    buzzes: [],
    buzzedPlayerIds: new Set(),
    scores: new Map(),
    scoreLog: [],
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
  if (!game) return null;
  if (game.phase !== "reading" && game.phase !== "countdown") return null;
  if (game.buzzedPlayerIds.has(playerId)) return null;
  const player = game.players.get(playerId);
  if (!player) return null;

  if (game.phase === "countdown" && game.countdownStartedAt) {
    const elapsed = Date.now() - game.countdownStartedAt;
    const duration = getCountdownDuration(game) * 1000;
    if (elapsed > duration) return null;
  }

  const now = Date.now();
  const readingTimeMs = game.readingStartedAt
    ? now - game.readingStartedAt
    : null;
  const countdownTimeMs = game.countdownStartedAt
    ? now - game.countdownStartedAt
    : null;

  const position = game.buzzes.length + 1;
  game.buzzes.push({
    playerId,
    playerName: player.name,
    timestamp: now,
    position,
    readingTimeMs,
    countdownTimeMs,
  });
  game.buzzedPlayerIds.add(playerId);
  game.phaseBeforeBuzz = game.phase;
  game.phase = "buzzed";
  broadcast(code);
  return { position };
}

export function adminAction(
  code: string,
  adminToken: string,
  action: string,
  payload?: Record<string, unknown>,
): boolean {
  const game = games.get(code);
  if (!game || game.adminToken !== adminToken) return false;

  switch (action) {
    case "open": {
      game.phase = "reading";
      game.buzzes = [];
      game.buzzedPlayerIds.clear();
      game.readingStartedAt = Date.now();
      game.countdownStartedAt = null;
      game.readingTimeMs = null;
      break;
    }
    case "close": {
      game.phase = "idle";
      break;
    }
    case "clear": {
      game.buzzes = [];
      game.buzzedPlayerIds.clear();
      if (game.phase === "buzzed") {
        game.phase = game.countdownStartedAt ? "countdown" : "reading";
      }
      break;
    }
    case "next": {
      if (game.pkg) {
        const theme = game.pkg.themes[game.currentTheme];
        if (theme && game.currentQuestion < theme.questions.length - 1) {
          game.currentQuestion++;
        } else if (game.currentTheme < game.pkg.themes.length - 1) {
          game.currentTheme++;
          game.currentQuestion = 0;
        }
      }
      resetQuestion(game);
      break;
    }
    case "prev": {
      if (game.pkg) {
        if (game.currentQuestion > 0) {
          game.currentQuestion--;
        } else if (game.currentTheme > 0) {
          game.currentTheme--;
          const prevTheme = game.pkg.themes[game.currentTheme];
          game.currentQuestion = prevTheme
            ? prevTheme.questions.length - 1
            : 0;
        }
      }
      resetQuestion(game);
      break;
    }
    case "readout": {
      if (game.phase !== "reading") break;
      game.readingTimeMs = game.readingStartedAt
        ? Date.now() - game.readingStartedAt
        : null;
      game.phase = "countdown";
      game.countdownStartedAt = Date.now();
      break;
    }
    case "upload-package": {
      const pkg = payload?.package as GamePackage | undefined;
      if (!pkg?.themes?.length) return false;
      game.pkg = pkg;
      game.currentTheme = 0;
      game.currentQuestion = 0;
      game.phase = "idle";
      game.buzzes = [];
      game.buzzedPlayerIds.clear();
      game.readingStartedAt = null;
      game.countdownStartedAt = null;
      game.readingTimeMs = null;
      const allValues = new Set<number>();
      for (const t of pkg.themes)
        for (const q of t.questions) allValues.add(q.value);
      for (const v of allValues) {
        if (!(v in game.timerSettings)) game.timerSettings[v] = 15;
      }
      break;
    }
    case "set-timer": {
      const settings = payload?.settings as Record<string, number> | undefined;
      if (!settings) return false;
      for (const [k, v] of Object.entries(settings)) {
        const num = Number(k);
        if (num > 0 && v > 0 && v <= 120) game.timerSettings[num] = v;
      }
      break;
    }
    case "set-half-minus": {
      game.halfMinus = !!payload?.enabled;
      break;
    }
    case "plus": {
      if (game.phase !== "buzzed" || game.buzzes.length === 0) return false;
      const lastBuzz = game.buzzes[game.buzzes.length - 1];
      const q = getCurrentQuestion(game);
      if (q) {
        game.scoreLog.push({
          themeIndex: game.currentTheme,
          questionIndex: game.currentQuestion,
          playerId: lastBuzz.playerId,
          playerName: lastBuzz.playerName,
          result: "+",
          value: q.value,
        });
        recalcScores(game);
      }
      game.phase = "idle";
      break;
    }
    case "minus": {
      if (game.phase !== "buzzed" || game.buzzes.length === 0) return false;
      const lastBuzz = game.buzzes[game.buzzes.length - 1];
      const q = getCurrentQuestion(game);
      if (q) {
        const penaltyValue = game.halfMinus ? q.value / 2 : q.value;
        game.scoreLog.push({
          themeIndex: game.currentTheme,
          questionIndex: game.currentQuestion,
          playerId: lastBuzz.playerId,
          playerName: lastBuzz.playerName,
          result: "-",
          value: penaltyValue,
        });
        recalcScores(game);
      }
      game.phase = game.phaseBeforeBuzz ?? "reading";
      break;
    }
    case "dismiss": {
      if (game.phase !== "buzzed") return false;
      game.phase = "idle";
      break;
    }
    case "score-edit": {
      const ti = Number(payload?.themeIndex ?? -1);
      const qi = Number(payload?.questionIndex ?? -1);
      const pid = payload?.playerId as string;
      const result = (payload?.result as "+" | "-" | null) ?? null;
      if (ti < 0 || qi < 0 || !pid) return false;
      game.scoreLog = game.scoreLog.filter(
        (e) => !(e.themeIndex === ti && e.questionIndex === qi && e.playerId === pid),
      );
      if (result) {
        const q = game.pkg?.themes[ti]?.questions[qi];
        if (!q) return false;
        const player = game.players.get(pid);
        if (!player) return false;
        game.scoreLog.push({
          themeIndex: ti,
          questionIndex: qi,
          playerId: pid,
          playerName: player.name,
          result,
          value: q.value,
        });
      }
      recalcScores(game);
      break;
    }
    case "goto": {
      const ti = Number(payload?.theme ?? -1);
      const qi = Number(payload?.question ?? -1);
      if (game.pkg && ti >= 0 && qi >= 0) {
        const theme = game.pkg.themes[ti];
        if (theme && qi < theme.questions.length) {
          game.currentTheme = ti;
          game.currentQuestion = qi;
          resetQuestion(game);
        }
      }
      break;
    }
    default:
      return false;
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

export function gameExists(code: string): boolean {
  return games.has(code);
}

export function getGameState(code: string): GameStateDTO | null {
  const game = games.get(code);
  return game ? toDTO(game) : null;
}

export function getRoomStatus(code: string): RoomStatusDTO | null {
  const game = games.get(code);
  if (!game) return null;
  return {
    exists: true,
    playerCount: game.players.size,
    phase: game.phase,
    hasPackage: !!game.pkg,
    packageTitle: game.pkg?.title ?? null,
  };
}

export function isValidAdmin(code: string, adminToken: string): boolean {
  const game = games.get(code);
  return !!game && game.adminToken === adminToken;
}

export function subscribe(code: string, listener: GameListener): () => void {
  if (!gameListeners.has(code)) gameListeners.set(code, new Set());
  gameListeners.get(code)!.add(listener);
  return () => {
    gameListeners.get(code)?.delete(listener);
  };
}

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, game] of games) {
    if (game.createdAt < cutoff) {
      games.delete(code);
      gameListeners.delete(code);
    }
  }
}, 5 * 60 * 1000);
