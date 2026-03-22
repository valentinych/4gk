"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Copy,
  Check,
  Users,
  Unlock,
  Lock,
  Trash2,
  ArrowLeft,
  UserX,
  Crown,
} from "lucide-react";

interface GameState {
  code: string;
  status: "closed" | "open";
  players: { id: string; name: string }[];
  buzzes: { playerId: string; playerName: string; position: number }[];
}

type Role = "loading" | "join" | "admin" | "player";

function playBuzzSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

function playOpenSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export default function GameRoom({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [role, setRole] = useState<Role>("loading");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState("");
  const [myToken, setMyToken] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [copied, setCopied] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const prevBuzzCountRef = useRef(0);
  const prevStatusRef = useRef<string>("closed");

  useEffect(() => {
    const adminToken = localStorage.getItem(`buzzer_admin_${code}`);
    const playerId = localStorage.getItem(`buzzer_player_${code}`);
    const savedName = localStorage.getItem("buzzer_player_name");

    if (adminToken) {
      setMyToken(adminToken);
      setRole("admin");
    } else if (playerId) {
      setMyId(playerId);
      setRole("player");
    } else {
      if (savedName) setJoinName(savedName);
      setRole("join");
    }
  }, [code]);

  const connectSSE = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`/api/buzzer/${code}/events`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data: GameState = JSON.parse(e.data);
        setGameState((prev) => {
          if (data.buzzes.length > prevBuzzCountRef.current) {
            playBuzzSound();
            try {
              navigator.vibrate?.(100);
            } catch {}
          }
          if (
            data.status === "open" &&
            prevStatusRef.current === "closed" &&
            prevBuzzCountRef.current >= 0
          ) {
            playOpenSound();
            try {
              navigator.vibrate?.(50);
            } catch {}
          }
          prevBuzzCountRef.current = data.buzzes.length;
          prevStatusRef.current = data.status;
          return data;
        });
      } catch {}
    };

    es.onerror = () => {
      es.close();
      setTimeout(connectSSE, 2000);
    };
  }, [code]);

  useEffect(() => {
    if (role === "loading" || role === "join") return;
    connectSSE();
    return () => esRef.current?.close();
  }, [role, connectSSE]);

  async function handleJoin() {
    const name = joinName.trim();
    if (!name) return;
    setJoining(true);
    setJoinError("");
    try {
      const res = await fetch(`/api/buzzer/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const { playerId } = await res.json();
      localStorage.setItem(`buzzer_player_${code}`, playerId);
      localStorage.setItem("buzzer_player_name", name);
      setMyId(playerId);
      setRole("player");
    } catch {
      setJoinError("Не удалось подключиться");
      setJoining(false);
    }
  }

  async function handleBuzz() {
    await fetch(`/api/buzzer/${code}/buzz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: myId }),
    });
  }

  async function handleAction(action: "open" | "close" | "clear") {
    await fetch(`/api/buzzer/${code}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: myToken, action }),
    });
  }

  async function handleKick(playerId: string) {
    await fetch(`/api/buzzer/${code}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminToken: myToken,
        action: "kick",
        playerId,
      }),
    });
  }

  function copyCode() {
    const url = `${window.location.origin}/buzzer/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (role === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (role === "join") {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 sm:py-20">
        <Link
          href="/buzzer"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="text-center mb-4">
            <p className="font-mono text-2xl font-bold tracking-[0.2em]">
              {code}
            </p>
            <p className="text-xs text-muted mt-1">Код игры</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Ваше имя"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
            <button
              onClick={handleJoin}
              disabled={joining || !joinName.trim()}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-40"
            >
              {joining ? "Подключаемся..." : "Войти в игру"}
            </button>
            {joinError && (
              <p className="text-sm text-red-600 text-center">{joinError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (role === "admin") {
    return (
      <AdminView
        gameState={gameState}
        code={code}
        onAction={handleAction}
        onKick={handleKick}
        onCopyCode={copyCode}
        copied={copied}
      />
    );
  }

  return (
    <PlayerView
      gameState={gameState}
      code={code}
      myId={myId}
      onBuzz={handleBuzz}
    />
  );
}

function AdminView({
  gameState,
  code,
  onAction,
  onKick,
  onCopyCode,
  copied,
}: {
  gameState: GameState;
  code: string;
  onAction: (action: "open" | "close" | "clear") => void;
  onKick: (playerId: string) => void;
  onCopyCode: () => void;
  copied: boolean;
}) {
  const isOpen = gameState.status === "open";
  const hasBuzzes = gameState.buzzes.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link
        href="/buzzer"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Панель ведущего</h1>
            <p className="text-xs text-muted">Управление кнопками</p>
          </div>
        </div>
        <button
          onClick={onCopyCode}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono font-bold tracking-wider hover:bg-surface transition-colors"
        >
          {code}
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-muted" />
          )}
        </button>
      </div>

      {/* Status + Controls */}
      <div className="rounded-xl border border-border bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${isOpen ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
            />
            <span className="text-sm font-bold">
              {isOpen ? "Кнопки открыты" : "Кнопки закрыты"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Users className="h-3.5 w-3.5" />
            {gameState.players.length}
          </div>
        </div>

        <div className="flex gap-2">
          {isOpen ? (
            <button
              onClick={() => onAction("close")}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-3 text-sm font-bold text-white hover:bg-gray-700 transition-colors"
            >
              <Lock className="h-4 w-4" />
              Закрыть
            </button>
          ) : (
            <button
              onClick={() => onAction("open")}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 transition-colors"
            >
              <Unlock className="h-4 w-4" />
              Открыть кнопки
            </button>
          )}
          {hasBuzzes && (
            <button
              onClick={() => onAction("clear")}
              className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-surface transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Сброс
            </button>
          )}
        </div>
      </div>

      {/* Buzz Results */}
      {hasBuzzes && (
        <div className="rounded-xl border border-border bg-white p-5 mb-4">
          <h2 className="text-sm font-bold mb-3">Нажали кнопку</h2>
          <div className="space-y-2">
            {gameState.buzzes.map((b) => (
              <div
                key={b.playerId}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                  b.position === 1
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-surface"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    b.position === 1
                      ? "bg-amber-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {b.position}
                </span>
                <span
                  className={`text-sm font-medium ${b.position === 1 ? "text-amber-900" : ""}`}
                >
                  {b.playerName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Players */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-bold mb-3">
          Игроки ({gameState.players.length})
        </h2>
        {gameState.players.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">
            Ждём игроков... Поделитесь кодом{" "}
            <span className="font-mono font-bold">{code}</span>
          </p>
        ) : (
          <div className="space-y-1.5">
            {gameState.players.map((p) => {
              const buzzed = gameState.buzzes.find(
                (b) => b.playerId === p.id,
              );
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface/50"
                >
                  <div className="flex items-center gap-2">
                    <Zap
                      className={`h-3.5 w-3.5 ${buzzed ? "text-amber-500" : "text-muted/30"}`}
                    />
                    <span className="text-sm">{p.name}</span>
                    {buzzed && (
                      <span className="text-xs font-mono text-muted">
                        #{buzzed.position}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onKick(p.id)}
                    className="rounded p-1 text-muted/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Удалить"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerView({
  gameState,
  code,
  myId,
  onBuzz,
}: {
  gameState: GameState;
  code: string;
  myId: string;
  onBuzz: () => void;
}) {
  const isOpen = gameState.status === "open";
  const myBuzz = gameState.buzzes.find((b) => b.playerId === myId);
  const hasBuzzed = !!myBuzz;
  const firstBuzz =
    gameState.buzzes.length > 0 ? gameState.buzzes[0] : null;
  const someoneElseBuzzed = firstBuzz && firstBuzz.playerId !== myId;
  const myPlayer = gameState.players.find((p) => p.id === myId);

  let buttonState: "ready" | "buzzed" | "locked" | "taken";
  if (hasBuzzed) buttonState = "buzzed";
  else if (isOpen) buttonState = "ready";
  else if (someoneElseBuzzed) buttonState = "taken";
  else buttonState = "locked";

  const buttonStyles = {
    ready:
      "bg-red-500 shadow-[0_8px_0_0_#991b1b] hover:bg-red-400 active:shadow-[0_2px_0_0_#991b1b] active:translate-y-1.5 cursor-pointer",
    buzzed:
      "bg-amber-500 shadow-[0_4px_0_0_#92400e] cursor-default",
    locked:
      "bg-gray-300 shadow-[0_4px_0_0_#9ca3af] cursor-not-allowed",
    taken:
      "bg-gray-400 shadow-[0_4px_0_0_#6b7280] cursor-not-allowed",
  };

  const statusText = {
    ready: "ЖМЯК!",
    buzzed: `#${myBuzz?.position}`,
    locked: "ЖДИТЕ",
    taken: gameState.buzzes[0]?.playerName ?? "—",
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-3.5rem)] px-4 py-6 select-none">
      {/* Top info */}
      <div className="flex items-center gap-3 mb-2 text-xs text-muted">
        <span className="font-mono font-bold tracking-wider">{code}</span>
        <span>•</span>
        <span>{myPlayer?.name}</span>
        <span>•</span>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {gameState.players.length}
        </div>
      </div>

      {/* Status text */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isOpen
                ? "bg-green-500 animate-pulse"
                : "bg-gray-300"
            }`}
          />
          <span className="text-sm font-medium text-muted">
            {isOpen ? "Кнопки открыты" : "Кнопки закрыты"}
          </span>
        </div>
      </div>

      {/* Buzzer Button */}
      <button
        onClick={() => buttonState === "ready" && onBuzz()}
        disabled={buttonState !== "ready"}
        className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center text-white font-bold transition-all duration-100 ${buttonStyles[buttonState]}`}
      >
        <span
          className={`${buttonState === "buzzed" ? "text-5xl" : "text-2xl"}`}
        >
          {statusText[buttonState]}
        </span>
      </button>

      {/* Buzz results below button */}
      {gameState.buzzes.length > 0 && (
        <div className="mt-8 w-full max-w-xs space-y-1.5">
          {gameState.buzzes.map((b) => (
            <div
              key={b.playerId}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                b.playerId === myId
                  ? b.position === 1
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-blue-50 border border-blue-200"
                  : "bg-surface"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  b.position === 1
                    ? "bg-amber-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {b.position}
              </span>
              <span className="text-sm font-medium">
                {b.playerName}
                {b.playerId === myId && (
                  <span className="text-xs text-muted ml-1">(вы)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
