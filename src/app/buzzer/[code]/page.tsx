"use client";

import React, { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Copy,
  Check,
  Users,
  Trash2,
  ArrowLeft,
  UserX,
  Crown,
  ChevronRight,
  ChevronLeft,
  Upload,
  Settings,
  BookOpen,
  Timer,
} from "lucide-react";

interface ScoreLogEntry {
  themeIndex: number;
  questionIndex: number;
  playerId: string;
  playerName: string;
  result: "+" | "-";
  value: number;
}

interface GameState {
  code: string;
  phase: "idle" | "reading" | "countdown" | "buzzed";
  hasPackage: boolean;
  packageTitle: string | null;
  totalThemes: number;
  questionsPerTheme: number;
  currentTheme: number;
  currentQuestion: number;
  currentThemeName: string | null;
  currentValue: number | null;
  questionForm: string | null;
  handout: { type: "text" | "image"; content: string } | null;
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
  scoreLog: ScoreLogEntry[];
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

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  const s = ms / 1000;
  return s < 10 ? s.toFixed(2) + "с" : s.toFixed(1) + "с";
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, ms / 1000);
  return s.toFixed(1);
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
        if (data.buzzes.length > prevBuzzCountRef.current) {
          playBuzzSound();
          try { navigator.vibrate?.(100); } catch {}
        }
        prevBuzzCountRef.current = data.buzzes.length;
        setGameState(data);
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

  async function sendAction(action: string, extra?: Record<string, unknown>) {
    await fetch(`/api/buzzer/${code}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: myToken, action, ...extra }),
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(`${window.location.origin}/buzzer/${code}`);
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
        <Link href="/buzzer" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Назад
        </Link>
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="text-center mb-4">
            <p className="font-mono text-2xl font-bold tracking-[0.2em]">{code}</p>
            <p className="text-xs text-muted mt-1">Код игры</p>
          </div>
          <div className="space-y-3">
            <input type="text" value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="Ваше имя" onKeyDown={(e) => e.key === "Enter" && handleJoin()} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" autoFocus />
            <button onClick={handleJoin} disabled={joining || !joinName.trim()} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-40">
              {joining ? "Подключаемся..." : "Войти в игру"}
            </button>
            {joinError && <p className="text-sm text-red-600 text-center">{joinError}</p>}
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
        gs={gameState}
        code={code}
        onAction={sendAction}
        onCopy={copyCode}
        copied={copied}
      />
    );
  }

  return (
    <PlayerView gs={gameState} code={code} myId={myId} onBuzz={handleBuzz} />
  );
}

/* ─── Admin View ─── */

function AdminView({
  gs,
  code,
  onAction,
  onCopy,
  copied,
}: {
  gs: GameState;
  code: string;
  onAction: (action: string, extra?: Record<string, unknown>) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [localTimer, setLocalTimer] = useState<Record<number, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTimer(gs.timerSettings);
  }, [gs.timerSettings]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const pkg = JSON.parse(reader.result as string);
        onAction("upload-package", { package: pkg });
      } catch {
        alert("Ошибка чтения JSON файла");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function saveTimer() {
    onAction("set-timer", { settings: localTimer });
    setShowSettings(false);
  }

  const hasPkg = gs.hasPackage;
  const isActive = gs.phase === "reading" || gs.phase === "countdown";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link href="/buzzer" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Назад
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Панель ведущего</h1>
            {gs.packageTitle && <p className="text-xs text-muted truncate max-w-[200px]">{gs.packageTitle}</p>}
          </div>
        </div>
        <button onClick={onCopy} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono font-bold tracking-wider hover:bg-surface transition-colors">
          {code}
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted" />}
        </button>
      </div>

      {/* Package upload */}
      {!hasPkg && (
        <div className="rounded-xl border-2 border-dashed border-border bg-white p-6 mb-4 text-center">
          <Upload className="h-8 w-8 text-muted mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Загрузите пакет вопросов</p>
          <p className="text-xs text-muted mb-3">JSON-файл с темами и вопросами</p>
          <button onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent/90">
            Выбрать файл
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleUpload} className="hidden" />
        </div>
      )}

      {/* Current question info */}
      {hasPkg && (
        <div className="rounded-xl border border-border bg-white p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted">
                Тема {gs.currentTheme + 1}/{gs.totalThemes} • Вопрос {gs.currentQuestion + 1}/{gs.questionsPerTheme}
              </p>
              <p className="text-base font-bold">{gs.currentThemeName}</p>
            </div>
            <div className="text-right">
              {gs.currentValue && (
                <span className="inline-flex items-center justify-center h-10 w-14 rounded-lg bg-accent/10 text-accent font-mono text-lg font-bold">
                  {gs.currentValue}
                </span>
              )}
            </div>
          </div>

          {/* Navigation + controls */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => onAction("prev")} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button onClick={() => onAction("next")} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
              Next <ChevronRight className="h-4 w-4" />
            </button>

            {gs.phase === "reading" && (
              <button onClick={() => onAction("readout")} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors">
                <BookOpen className="h-4 w-4" /> Дочитан
              </button>
            )}

            {gs.phase === "idle" && (
              <button onClick={() => onAction("open")} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-500 transition-colors">
                <Zap className="h-4 w-4" /> Открыть кнопки
              </button>
            )}

            {gs.buzzes.length > 0 && (
              <button onClick={() => onAction("clear")} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
                <Trash2 className="h-4 w-4" /> Сброс
              </button>
            )}
          </div>

          {/* Reading time + countdown status */}
          <AdminTimers gs={gs} />
        </div>
      )}

      {/* Handout (admin) */}
      <HandoutBlock handout={gs.handout} />

      {/* No-package mode */}
      {!hasPkg && (
        <div className="rounded-xl border border-border bg-white p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
              <span className="text-sm font-bold">{isActive ? "Кнопки открыты" : "Кнопки закрыты"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {isActive ? (
              <button onClick={() => onAction("close")} className="flex-1 rounded-lg bg-gray-800 px-4 py-3 text-sm font-bold text-white hover:bg-gray-700">Закрыть</button>
            ) : (
              <button onClick={() => onAction("open")} className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500">Открыть кнопки</button>
            )}
            {gs.buzzes.length > 0 && (
              <button onClick={() => onAction("clear")} className="rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-surface"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
          <div className="mt-3 text-center">
            <button onClick={() => fileInputRef.current?.click()} className="text-xs text-accent hover:underline">
              Загрузить пакет вопросов (JSON)
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleUpload} className="hidden" />
          </div>
        </div>
      )}

      {/* Scoring section (after buzz) */}
      {gs.phase === "buzzed" && gs.buzzes.length > 0 && (() => {
        const lastBuzz = gs.buzzes[gs.buzzes.length - 1];
        return (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white text-sm font-bold">
                {lastBuzz.position}
              </span>
              <div className="flex-1">
                <p className="text-base font-bold text-amber-900">{lastBuzz.playerName}</p>
                <div className="text-xs font-mono text-muted space-x-2">
                  {lastBuzz.readingTimeMs !== null && <span>{fmtMs(lastBuzz.readingTimeMs)}</span>}
                  {lastBuzz.countdownTimeMs !== null && <span className="text-accent">{fmtMs(lastBuzz.countdownTimeMs)}</span>}
                </div>
              </div>
              {gs.currentValue && (
                <span className="text-lg font-mono font-bold text-amber-700">{gs.currentValue}</span>
              )}
            </div>
            {gs.questionForm && (
              <div className="rounded-lg bg-amber-100/60 px-3 py-2 mb-3">
                <p className="text-xs font-medium text-amber-700 mb-0.5">Форма вопроса</p>
                <p className="text-sm text-amber-900">{gs.questionForm}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => onAction("plus")} className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 transition-colors">
                ✓ Верно {gs.currentValue ? `(+${gs.currentValue})` : ""}
              </button>
              <button onClick={() => onAction("minus")} className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500 transition-colors">
                ✗ Неверно {gs.currentValue ? `(−${gs.halfMinus ? gs.currentValue / 2 : gs.currentValue})` : ""}
              </button>
              <button onClick={() => onAction("dismiss")} className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium hover:bg-surface transition-colors">
                Сброс
              </button>
            </div>
          </div>
        );
      })()}

      {/* Question form (when not buzzed but visible) */}
      {gs.phase !== "buzzed" && gs.questionForm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-4">
          <p className="text-xs font-medium text-amber-700 mb-1">Форма вопроса</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{gs.questionForm}</p>
        </div>
      )}

      {/* Buzz list (when not in active scoring) */}
      {gs.phase !== "buzzed" && gs.buzzes.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 mb-4">
          <h2 className="text-sm font-bold mb-3">Нажали кнопку</h2>
          <div className="space-y-2">
            {gs.buzzes.map((b) => (
              <div key={b.playerId} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${b.position === 1 ? "bg-amber-50 border border-amber-200" : "bg-surface"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${b.position === 1 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {b.position}
                </span>
                <span className={`text-sm font-medium flex-1 ${b.position === 1 ? "text-amber-900" : ""}`}>{b.playerName}</span>
                <div className="text-xs font-mono text-muted space-x-2">
                  {b.readingTimeMs !== null && <span title="Время с начала чтения">{fmtMs(b.readingTimeMs)}</span>}
                  {b.countdownTimeMs !== null && <span title="Время с начала обратного отсчёта" className="text-accent">{fmtMs(b.countdownTimeMs)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timer settings */}
      {hasPkg && (
        <div className="rounded-xl border border-border bg-white mb-4">
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center justify-between w-full px-5 py-3 text-sm font-medium hover:bg-surface/50 transition-colors">
            <span className="flex items-center gap-2"><Settings className="h-4 w-4 text-muted" /> Настройки</span>
            <ChevronRight className={`h-4 w-4 text-muted transition-transform ${showSettings ? "rotate-90" : ""}`} />
          </button>
          {showSettings && (
            <div className="px-5 pb-4 border-t border-border pt-3 space-y-3">
              <div
                onClick={() => onAction("set-half-minus", { enabled: !gs.halfMinus })}
                className="flex items-center justify-between cursor-pointer rounded-lg px-3 py-2.5 hover:bg-surface/50 transition-colors -mx-3"
              >
                <div>
                  <p className="text-sm font-medium">Половинные минусы</p>
                  <p className="text-xs text-muted">При неправильном ответе −½ номинала</p>
                </div>
                <div className={`relative w-10 h-6 rounded-full transition-colors ${gs.halfMinus ? "bg-accent" : "bg-gray-300"}`}>
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${gs.halfMinus ? "left-5" : "left-1"}`} />
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-muted mb-2">Таймер (сек)</p>
                {Object.entries(localTimer).sort(([a], [b]) => Number(a) - Number(b)).map(([val, sec]) => (
                  <div key={val} className="flex items-center gap-3 mb-1.5">
                    <span className="text-sm font-mono w-8 text-right">{val}</span>
                    <input type="number" min={1} max={120} value={sec} onChange={(e) => setLocalTimer((p) => ({ ...p, [Number(val)]: Number(e.target.value) || 1 }))} className="w-20 rounded-lg border border-border px-2 py-1.5 text-sm text-center font-mono focus:border-accent focus:outline-none" />
                    <span className="text-xs text-muted">сек</span>
                  </div>
                ))}
                <button onClick={saveTimer} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent/90 mt-1">Сохранить</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score table */}
      {hasPkg && gs.players.length > 0 && gs.scoreLog.length > 0 && (
        <AdminScoreTable gs={gs} onAction={onAction} />
      )}

      {/* Players with scores */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-bold mb-3">Игроки ({gs.players.length})</h2>
        {gs.players.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">Ждём игроков... Поделитесь кодом <span className="font-mono font-bold">{code}</span></p>
        ) : (
          <div className="space-y-1.5">
            {[...gs.players]
              .sort((a, b) => (gs.scores[b.id] ?? 0) - (gs.scores[a.id] ?? 0))
              .map((p) => {
                const buzzed = gs.buzzes.find((b) => b.playerId === p.id);
                const score = gs.scores[p.id] ?? 0;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface/50">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-3.5 w-3.5 ${buzzed ? "text-amber-500" : "text-muted/30"}`} />
                      <span className="text-sm">{p.name}</span>
                      {buzzed && <span className="text-xs font-mono text-muted">#{buzzed.position}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-mono font-bold tabular-nums ${score > 0 ? "text-green-600" : score < 0 ? "text-red-600" : "text-muted"}`}>
                        {score}
                      </span>
                      <button onClick={() => onAction("kick", { playerId: p.id })} className="rounded p-1 text-muted/40 hover:text-red-500 hover:bg-red-50 transition-colors" title="Удалить">
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminTimers({ gs }: { gs: GameState }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (gs.phase !== "reading" && gs.phase !== "countdown") return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [gs.phase]);

  if (gs.phase === "reading" && gs.readingStartedAt) {
    const elapsed = now - gs.readingStartedAt;
    return (
      <div className="mt-3 flex items-center gap-2 text-sm">
        <Timer className="h-4 w-4 text-blue-500" />
        <span className="font-mono tabular-nums">{(elapsed / 1000).toFixed(1)}с</span>
        <span className="text-xs text-muted">чтение</span>
      </div>
    );
  }

  if (gs.phase === "countdown" && gs.countdownStartedAt) {
    const elapsed = now - gs.countdownStartedAt;
    const remaining = Math.max(0, gs.countdownDuration * 1000 - elapsed);
    const pct = remaining / (gs.countdownDuration * 1000);
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 text-sm mb-1.5">
          <Timer className={`h-4 w-4 ${remaining > 0 ? "text-orange-500" : "text-red-500"}`} />
          <span className="font-mono tabular-nums text-lg font-bold">{fmtCountdown(remaining)}</span>
          {gs.readingTimeMs && <span className="text-xs text-muted ml-2">чтение: {fmtMs(gs.readingTimeMs)}</span>}
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-100 ${pct > 0.3 ? "bg-orange-400" : "bg-red-500"}`} style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    );
  }

  if (gs.phase === "buzzed" && gs.readingTimeMs) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Timer className="h-3.5 w-3.5" />
        <span>Чтение: {fmtMs(gs.readingTimeMs)}</span>
      </div>
    );
  }

  return null;
}

/* ─── Handout Block ─── */

function HandoutBlock({ handout }: { handout: { type: "text" | "image"; content: string } | null }) {
  if (!handout) return null;
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-4">
      <p className="text-xs font-medium text-indigo-600 mb-2">📎 Раздаточный материал</p>
      {handout.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={handout.content}
          alt="Раздаточный материал"
          className="max-w-full max-h-[400px] rounded-lg mx-auto object-contain"
        />
      ) : (
        <p className="text-sm text-indigo-900 whitespace-pre-wrap">{handout.content}</p>
      )}
    </div>
  );
}

/* ─── Admin Score Table ─── */

function AdminScoreTable({
  gs,
  onAction,
}: {
  gs: GameState;
  onAction: (action: string, extra?: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const players = gs.players;

  function getCell(ti: number, qi: number, pid: string): "+" | "-" | null {
    const entry = gs.scoreLog.find(
      (e) => e.themeIndex === ti && e.questionIndex === qi && e.playerId === pid,
    );
    return entry?.result ?? null;
  }

  function cycleCell(ti: number, qi: number, pid: string) {
    const cur = getCell(ti, qi, pid);
    const next = cur === null ? "+" : cur === "+" ? "-" : null;
    onAction("score-edit", { themeIndex: ti, questionIndex: qi, playerId: pid, result: next });
  }

  function runningTotal(upToTheme: number, pid: string): number {
    return gs.scoreLog
      .filter((e) => e.themeIndex <= upToTheme && e.playerId === pid)
      .reduce((s, e) => s + (e.result === "+" ? e.value : -e.value), 0);
  }

  const themes = gs.questionValues.map((qv, ti) => ({
    ti,
    name: gs.themeNames[ti] ?? `Тема ${ti + 1}`,
    questions: qv,
  }));

  return (
    <div className="rounded-xl border border-border bg-white mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-3 text-sm font-medium hover:bg-surface/50 transition-colors"
      >
        <span className="flex items-center gap-2">📊 Таблица результатов</span>
        <ChevronRight className={`h-4 w-4 text-muted transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="border-t border-border overflow-x-auto">
          <table className="text-xs border-collapse w-full min-w-0">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="sticky left-0 bg-surface/50 z-10 px-2 py-2 text-left font-medium min-w-[80px]"></th>
                {players.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center font-medium min-w-[60px] max-w-[80px] truncate">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Grand totals */}
              <tr className="border-b-2 border-border bg-accent/5 font-bold">
                <td className="sticky left-0 bg-accent/5 z-10 px-2 py-2">Всего</td>
                {players.map((p) => (
                  <td key={p.id} className="px-2 py-2 text-center font-mono tabular-nums">
                    {gs.scores[p.id] ?? 0}
                  </td>
                ))}
              </tr>

              {themes.map(({ ti, name, questions }) => {
                const hasEntries = gs.scoreLog.some((e) => e.themeIndex === ti);
                if (!hasEntries && ti !== gs.currentTheme) return null;

                return (
                  <React.Fragment key={ti}>
                    <tr className="border-t border-border bg-surface/30">
                      <td colSpan={players.length + 1} className="sticky left-0 px-2 py-1.5 font-bold text-xs text-muted">
                        {name}
                      </td>
                    </tr>
                    {questions.map((val, qi) => (
                      <tr key={`${ti}-${qi}`} className="border-t border-border/50 hover:bg-surface/30">
                        <td className="sticky left-0 bg-white z-10 px-2 py-1.5 font-mono text-right text-muted">
                          {val}
                        </td>
                        {players.map((p) => {
                          const cell = getCell(ti, qi, p.id);
                          return (
                            <td
                              key={p.id}
                              onClick={() => cycleCell(ti, qi, p.id)}
                              className={`px-2 py-1.5 text-center font-bold cursor-pointer select-none transition-colors hover:bg-surface/60 ${
                                cell === "+" ? "text-green-600 bg-green-50" : cell === "-" ? "text-red-600 bg-red-50" : ""
                              }`}
                            >
                              {cell ?? ""}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-t border-border bg-surface/20 text-[11px]">
                      <td className="sticky left-0 bg-surface/20 z-10 px-2 py-1 text-muted italic">
                        После {ti + 1}
                      </td>
                      {players.map((p) => (
                        <td key={p.id} className="px-2 py-1 text-center font-mono tabular-nums font-medium">
                          {runningTotal(ti, p.id)}
                        </td>
                      ))}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Player View ─── */

function PlayerView({
  gs,
  code,
  myId,
  onBuzz,
}: {
  gs: GameState;
  code: string;
  myId: string;
  onBuzz: () => void;
}) {
  const myBuzz = gs.buzzes.find((b) => b.playerId === myId);
  const hasBuzzed = !!myBuzz;
  const canBuzz = (gs.phase === "reading" || gs.phase === "countdown") && !hasBuzzed;

  const isCountdownExpired = gs.phase === "countdown" && gs.countdownStartedAt
    ? Date.now() - gs.countdownStartedAt > gs.countdownDuration * 1000
    : false;

  const buttonActive = canBuzz && !isCountdownExpired;

  const myPlayer = gs.players.find((p) => p.id === myId);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-3.5rem)] px-4 py-6 select-none">
      {/* Top info */}
      <div className="flex items-center gap-3 mb-2 text-xs text-muted">
        <span className="font-mono font-bold tracking-wider">{code}</span>
        <span>•</span>
        <span>{myPlayer?.name}</span>
        <span>•</span>
        <div className="flex items-center gap-1"><Users className="h-3 w-3" />{gs.players.length}</div>
      </div>

      {/* Theme & value */}
      {gs.hasPackage && gs.currentThemeName && (
        <div className="text-center mb-4">
          <p className="text-xs text-muted">{gs.currentThemeName}</p>
        </div>
      )}

      {/* Handout (player) */}
      {gs.handout && (
        <div className="w-full max-w-sm mb-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-xs font-medium text-indigo-600 mb-1.5">📎 Раздатка</p>
            {gs.handout.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={gs.handout.content} alt="Раздатка" className="max-w-full max-h-[250px] rounded-lg mx-auto object-contain" />
            ) : (
              <p className="text-sm text-indigo-900 whitespace-pre-wrap">{gs.handout.content}</p>
            )}
          </div>
        </div>
      )}

      {/* Countdown display */}
      <PlayerCountdown gs={gs} />

      {/* Buzzer Button */}
      <button
        onClick={() => buttonActive && onBuzz()}
        disabled={!buttonActive}
        className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center text-white font-bold transition-all duration-100 ${
          hasBuzzed
            ? "bg-yellow-400 shadow-[0_4px_0_0_#a16207] text-yellow-900"
            : buttonActive
              ? "bg-green-500 shadow-[0_8px_0_0_#166534] hover:bg-green-400 active:shadow-[0_2px_0_0_#166534] active:translate-y-1.5 cursor-pointer"
              : "bg-gray-300 shadow-[0_4px_0_0_#9ca3af] cursor-not-allowed text-gray-500"
        }`}
      >
        <span className={hasBuzzed ? "text-5xl" : "text-4xl font-mono"}>
          {hasBuzzed
            ? `#${myBuzz?.position}`
            : gs.currentValue
              ? gs.currentValue
              : buttonActive
                ? "!"
                : "—"}
        </span>
      </button>

      {/* Question form (after buzz) */}
      {gs.questionForm && (
        <div className="mt-6 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900 whitespace-pre-wrap text-center">{gs.questionForm}</p>
        </div>
      )}

      {/* Buzz results */}
      {gs.buzzes.length > 0 && (
        <div className="mt-6 w-full max-w-xs space-y-1.5">
          {gs.buzzes.map((b) => (
            <div key={b.playerId} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
              b.playerId === myId
                ? b.position === 1 ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"
                : "bg-surface"
            }`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${b.position === 1 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                {b.position}
              </span>
              <span className="text-sm font-medium flex-1">
                {b.playerName}
                {b.playerId === myId && <span className="text-xs text-muted ml-1">(вы)</span>}
              </span>
              {b.countdownTimeMs !== null && (
                <span className="text-xs font-mono text-muted">{fmtMs(b.countdownTimeMs)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Scoreboard */}
      {gs.players.length > 0 && Object.keys(gs.scores).length > 0 && (
        <div className="mt-6 w-full max-w-xs">
          <p className="text-xs font-bold text-muted mb-2 text-center">Счёт</p>
          <div className="rounded-xl border border-border bg-white divide-y divide-border">
            {[...gs.players]
              .sort((a, b) => (gs.scores[b.id] ?? 0) - (gs.scores[a.id] ?? 0))
              .map((p) => {
                const score = gs.scores[p.id] ?? 0;
                return (
                  <div key={p.id} className={`flex items-center justify-between px-3 py-2 ${p.id === myId ? "bg-accent/5" : ""}`}>
                    <span className="text-sm">{p.name}{p.id === myId ? <span className="text-xs text-muted ml-1">(вы)</span> : ""}</span>
                    <span className={`text-sm font-mono font-bold tabular-nums ${score > 0 ? "text-green-600" : score < 0 ? "text-red-600" : "text-muted"}`}>
                      {score}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCountdown({ gs }: { gs: GameState }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (gs.phase !== "countdown" || !gs.countdownStartedAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [gs.phase, gs.countdownStartedAt]);

  if (gs.phase !== "countdown" || !gs.countdownStartedAt) return null;

  const elapsed = now - gs.countdownStartedAt;
  const remaining = Math.max(0, gs.countdownDuration * 1000 - elapsed);
  const pct = remaining / (gs.countdownDuration * 1000);

  return (
    <div className="mb-4 w-48 sm:w-56">
      <div className="text-center mb-1">
        <span className={`font-mono text-2xl font-bold tabular-nums ${remaining > 0 ? "" : "text-red-500"}`}>
          {fmtCountdown(remaining)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${pct > 0.3 ? "bg-green-400" : pct > 0.1 ? "bg-orange-400" : "bg-red-500"}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
