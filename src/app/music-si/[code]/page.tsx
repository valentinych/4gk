"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Music,
  SkipForward,
  SkipBack,
  Check,
  X,
  Trash2,
  Users,
  Loader2,
  Volume2,
  Copy,
  Plus,
  Minus,
} from "lucide-react";

interface TeamDTO {
  id: string;
  name: string;
  players: { id: string; name: string }[];
}
interface BuzzDTO {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  trackTimeMs: number;
}
interface ScoreEntry {
  themeIndex: number;
  trackIndex: number;
  playerId: string;
  playerName: string;
  teamId: string;
  result: "+" | "-";
  value: number;
}
interface GameState {
  code: string;
  phase: "lobby" | "theme-intro" | "playing" | "buzzed" | "idle";
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
  teams: TeamDTO[];
  buzzes: BuzzDTO[];
  teamScores: Record<string, number>;
  scoreLog: ScoreEntry[];
  halfMinus: boolean;
}

export default function MusicSIRoom() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();

  const [state, setState] = useState<GameState | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const at = localStorage.getItem(`music_admin_${code}`);
    const pid = localStorage.getItem(`music_player_${code}`);
    const tid = localStorage.getItem(`music_team_${code}`);
    if (at) {
      setAdminToken(at);
      setIsAdmin(true);
    }
    if (pid) setPlayerId(pid);
    if (tid) setMyTeamId(tid);

    if (!at && !pid) {
      router.push("/music-si");
    }
  }, [code, router]);

  useEffect(() => {
    if (!code) return;
    const es = new EventSource(`/api/music-si/${code}/events`);
    es.onmessage = (e) => {
      try {
        setState(JSON.parse(e.data));
        setConnected(true);
      } catch {}
    };
    es.onerror = () => {
      setConnected(false);
      setTimeout(() => {
        es.close();
      }, 2000);
    };
    return () => es.close();
  }, [code]);

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return isAdmin ? (
    <AdminView
      state={state}
      code={code}
      adminToken={adminToken!}
      connected={connected}
    />
  ) : (
    <PlayerView
      state={state}
      code={code}
      playerId={playerId!}
      myTeamId={myTeamId}
      connected={connected}
    />
  );
}

/* ─── Admin View ─── */

function AdminView({
  state,
  code,
  adminToken,
  connected,
}: {
  state: GameState;
  code: string;
  adminToken: string;
  connected: boolean;
}) {
  const [driveUrl, setDriveUrl] = useState("");
  const [loadingRound, setLoadingRound] = useState(false);
  const [loadResult, setLoadResult] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [error, setError] = useState("");
  const [showScoreTable, setShowScoreTable] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevPhaseRef = useRef(state.phase);
  const lastAudioUrl = useRef<string | null>(null);

  const onAction = useCallback(
    async (action: string, extra?: Record<string, unknown>) => {
      setError("");
      const body: Record<string, unknown> = { adminToken, action, ...extra };
      const res = await fetch(`/api/music-si/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Action failed");
      }
    },
    [adminToken, code],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.phase === "playing" && state.audioUrl) {
      if (audio.src !== window.location.origin + state.audioUrl || lastAudioUrl.current !== state.audioUrl) {
        audio.src = state.audioUrl;
        lastAudioUrl.current = state.audioUrl;
      }
      audio.currentTime = state.trackResumeAt / 1000;
      audio.play().catch(() => {});
    } else if (state.phase === "buzzed" || state.phase === "idle" || state.phase === "theme-intro") {
      audio.pause();
    }

    prevPhaseRef.current = state.phase;
  }, [state.phase, state.audioUrl, state.trackResumeAt]);

  const handleTrackEnded = useCallback(() => {
    onAction("track-ended");
  }, [onAction]);

  async function handleLoadRound() {
    if (!driveUrl.trim()) return;
    setLoadingRound(true);
    setError("");
    setLoadResult("");
    try {
      const res = await fetch(`/api/music-si/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, action: "load-round", folderUrl: driveUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || "Ошибка загрузки";
        if (data.skippedFiles?.length) {
          msg += "\nНе распознаны: " + data.skippedFiles.join(", ");
        }
        setError(msg);
      } else {
        let msg = `Загружено ${data.themeCount} тем, ${data.totalTracks} треков`;
        if (data.skippedFiles?.length) {
          msg += ` (пропущено ${data.skippedFiles.length}: ${data.skippedFiles.join(", ")})`;
        }
        setLoadResult(msg);
      }
    } catch {
      setError("Ошибка сети");
    }
    setLoadingRound(false);
  }

  async function handleAddTeam() {
    if (!newTeamName.trim()) return;
    await onAction("add-team", { teamName: newTeamName.trim() });
    setNewTeamName("");
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const track = state.trackInfo;
  const totalPlayers = state.teams.reduce((s, t) => s + t.players.length, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <audio ref={audioRef} onEnded={handleTrackEnded} preload="auto" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/music-si"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Music SI
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`}
          />
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-mono font-bold tracking-wider hover:bg-surface transition-colors"
          >
            {code}
            <Copy className="h-3.5 w-3.5 text-muted" />
          </button>
          {copied && (
            <span className="text-xs text-green-600">Скопировано!</span>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {totalPlayers} игроков
        </span>
        <span>{state.teams.length} команд</span>
        {state.hasRound && (
          <span>
            Тема {state.currentTheme + 1}/{state.totalThemes}
            {state.trackCounts[state.currentTheme] > 0 &&
              ` · Трек ${state.currentTrack + 1}/${state.trackCounts[state.currentTheme]}`}
          </span>
        )}
        <span
          className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
            state.phase === "playing"
              ? "bg-green-100 text-green-700"
              : state.phase === "buzzed"
                ? "bg-yellow-100 text-yellow-700"
                : state.phase === "theme-intro"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-gray-100 text-gray-600"
          }`}
        >
          {state.phase}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column - controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Team management */}
          {state.phase === "lobby" && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-bold mb-3">Команды</h3>
              <div className="space-y-2 mb-3">
                {state.teams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-bold">{t.name}</span>
                      <span className="ml-2 text-xs text-muted">
                        {t.players.length} игроков
                      </span>
                      {t.players.length > 0 && (
                        <p className="text-xs text-muted mt-0.5">
                          {t.players.map((p) => p.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        onAction("remove-team", { teamId: t.id })
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                  placeholder="Название команды"
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                />
                <button
                  onClick={handleAddTeam}
                  disabled={!newTeamName.trim()}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Google Drive loader */}
          {(state.phase === "lobby" || !state.hasRound) && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-bold mb-3">Загрузить бой</h3>
              <p className="text-xs text-muted mb-2">
                Вставьте ссылку на папку боя в Google Drive (Бой → Темы → Треки)
              </p>
              <div className="flex gap-2">
                <input
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLoadRound()}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                />
                <button
                  onClick={handleLoadRound}
                  disabled={loadingRound || !driveUrl.trim()}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40"
                >
                  {loadingRound ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Загрузить"
                  )}
                </button>
              </div>
              {loadResult && (
                <p className="mt-2 text-xs text-green-600">{loadResult}</p>
              )}
            </div>
          )}

          {/* Current track info (admin only) */}
          {state.hasRound && state.phase !== "lobby" && (
            <div className="rounded-xl border border-border bg-surface p-5">
              {state.phase === "theme-intro" ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted mb-2 uppercase tracking-wider">
                    Тема {state.currentTheme + 1}
                  </p>
                  <h2 className="text-2xl font-bold">{state.currentThemeName}</h2>
                  <p className="text-sm text-muted mt-2">
                    Нажмите Next чтобы начать
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted">
                      {state.currentThemeName} · {state.currentValue} очков
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-muted" />
                      <span className="text-xs text-muted">
                        {state.phase === "playing" ? "Играет" : state.phase === "buzzed" ? "Пауза" : "Остановлен"}
                      </span>
                    </div>
                  </div>
                  {track && (
                    <div className="rounded-lg bg-violet-50 border border-violet-100 p-4 mb-3">
                      <p className="text-lg font-bold text-violet-800">
                        {track.artists}
                      </p>
                      <p className="text-sm text-violet-600">
                        {track.songName} · {track.style} · {track.year}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Buzz info */}
              {state.phase === "buzzed" && state.buzzes.length > 0 && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 mb-3">
                  <p className="text-sm font-bold text-yellow-800">
                    {state.buzzes[state.buzzes.length - 1].playerName}
                    <span className="font-normal ml-1 text-yellow-600">
                      ({state.buzzes[state.buzzes.length - 1].teamName})
                    </span>
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Нажал на{" "}
                    {(state.buzzes[state.buzzes.length - 1].trackTimeMs / 1000).toFixed(1)}с
                  </p>
                  <AnswerCountdown deadline={state.answerDeadlineTs} />
                </div>
              )}

              {/* Navigation & action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onAction("prev")}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface transition-colors"
                >
                  <SkipBack className="h-4 w-4" /> Prev
                </button>
                <button
                  onClick={() => onAction("next")}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 transition-colors"
                >
                  <SkipForward className="h-4 w-4" /> Next
                </button>

                {state.phase === "buzzed" && (
                  <>
                    <button
                      onClick={() => onAction("plus")}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" /> Верно
                      <span className="text-xs opacity-80">
                        +{state.currentValue}
                      </span>
                    </button>
                    <button
                      onClick={() => onAction("minus")}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                    >
                      <X className="h-4 w-4" /> Неверно
                      <span className="text-xs opacity-80">
                        -
                        {state.halfMinus
                          ? (state.currentValue ?? 0) / 2
                          : state.currentValue}
                      </span>
                    </button>
                    <button
                      onClick={() => onAction("dismiss")}
                      className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
                    >
                      Сброс
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Настройки</h3>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.halfMinus}
                onChange={(e) =>
                  onAction("set-half-minus", { enabled: e.target.checked })
                }
                className="rounded border-border"
              />
              Половинный минус (−½ номинала)
            </label>
          </div>
        </div>

        {/* Right column - score */}
        <div className="space-y-4">
          {/* Team scores */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-bold mb-3">Счёт</h3>
            <div className="space-y-2">
              {state.teams.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-sm font-bold">{t.name}</span>
                  <span className="text-lg font-bold text-violet-600">
                    {state.teamScores[t.id] ?? 0}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowScoreTable((v) => !v)}
              className="mt-3 text-xs text-violet-600 hover:underline"
            >
              {showScoreTable ? "Скрыть таблицу" : "Показать таблицу"}
            </button>
          </div>

          {/* Players list */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-bold mb-3">Игроки</h3>
            {state.teams.map((t) => (
              <div key={t.id} className="mb-3 last:mb-0">
                <p className="text-xs font-bold text-muted mb-1">{t.name}</p>
                {t.players.length === 0 ? (
                  <p className="text-xs text-muted/60 italic">Нет игроков</p>
                ) : (
                  <div className="space-y-1">
                    {t.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{p.name}</span>
                        <button
                          onClick={() => onAction("kick", { playerId: p.id })}
                          className="text-red-300 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score table modal */}
      {showScoreTable && (
        <AdminScoreTable state={state} onAction={onAction} />
      )}

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

/* ─── Player View ─── */

function PlayerView({
  state,
  code,
  playerId,
  myTeamId,
  connected,
}: {
  state: GameState;
  code: string;
  playerId: string;
  myTeamId: string | null;
  connected: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevPhaseRef = useRef(state.phase);
  const lastAudioUrl = useRef<string | null>(null);
  const [buzzSent, setBuzzSent] = useState(false);

  useEffect(() => {
    setBuzzSent(false);
  }, [state.currentTheme, state.currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.phase === "playing" && state.audioUrl) {
      if (audio.src !== window.location.origin + state.audioUrl || lastAudioUrl.current !== state.audioUrl) {
        audio.src = state.audioUrl;
        lastAudioUrl.current = state.audioUrl;
      }
      audio.currentTime = state.trackResumeAt / 1000;
      audio.play().catch(() => {});
    } else if (state.phase === "buzzed" || state.phase === "idle" || state.phase === "theme-intro") {
      audio.pause();
    }

    prevPhaseRef.current = state.phase;
  }, [state.phase, state.audioUrl, state.trackResumeAt]);

  async function handleBuzz() {
    if (buzzSent) return;
    const trackTimeMs = (audioRef.current?.currentTime ?? 0) * 1000;
    setBuzzSent(true);
    try {
      await fetch(`/api/music-si/${code}/buzz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, trackTimeMs }),
      });
      if (navigator.vibrate) navigator.vibrate(50);
    } catch {
      setBuzzSent(false);
    }
  }

  const lastBuzz = state.buzzes.length > 0 ? state.buzzes[state.buzzes.length - 1] : null;
  const iAmBuzzed = lastBuzz?.playerId === playerId;
  const myTeammatesBuzzed = lastBuzz && lastBuzz.teamId === myTeamId && !iAmBuzzed;
  const iAlreadyBuzzed = state.buzzes.some((b) => b.playerId === playerId);
  const canBuzz = state.phase === "playing" && !iAlreadyBuzzed && !buzzSent;

  let buttonColor = "bg-green-500 hover:bg-green-600 active:bg-green-700";
  let buttonText = `${state.currentValue ?? "—"}`;

  if (state.phase === "buzzed") {
    if (iAmBuzzed) {
      buttonColor = "bg-yellow-400";
      buttonText = "Вы нажали!";
    } else if (myTeammatesBuzzed) {
      buttonColor = "bg-violet-500";
      buttonText = `${lastBuzz?.playerName}`;
    } else {
      buttonColor = "bg-red-500";
      buttonText = `${lastBuzz?.playerName}`;
    }
  } else if (state.phase !== "playing") {
    buttonColor = "bg-gray-300";
    buttonText = state.phase === "theme-intro" ? (state.currentThemeName ?? "—") : "—";
  } else if (iAlreadyBuzzed || buzzSent) {
    buttonColor = "bg-gray-400";
    buttonText = "Уже нажали";
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <audio ref={audioRef} preload="auto" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <Link
          href="/music-si"
          className="text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`}
          />
          <span className="font-mono font-bold tracking-wider">{code}</span>
        </div>
        <Music className="h-4 w-4 text-violet-500" />
      </div>

      {/* Theme info */}
      {state.phase === "theme-intro" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">
              Тема {state.currentTheme + 1}
            </p>
            <h2 className="text-3xl font-bold">{state.currentThemeName}</h2>
          </div>
        </div>
      )}

      {/* Now playing info */}
      {state.phase !== "theme-intro" && state.phase !== "lobby" && (
        <>
          <div className="px-4 py-2 text-center">
            <p className="text-xs text-muted">
              {state.currentThemeName} · {state.currentValue} очков
            </p>
            {state.phase === "playing" && (
              <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-0.5">
                <Volume2 className="h-3 w-3" /> Играет
              </p>
            )}
          </div>

          {/* Answer countdown */}
          {state.phase === "buzzed" && state.answerDeadlineTs && (
            <div className="px-4">
              <AnswerCountdown deadline={state.answerDeadlineTs} />
            </div>
          )}

          {/* Big buzz button */}
          <div className="flex-1 flex items-center justify-center p-6">
            <button
              onClick={handleBuzz}
              disabled={!canBuzz}
              className={`w-56 h-56 rounded-full text-white text-2xl font-bold shadow-lg transition-all active:scale-95 disabled:active:scale-100 ${buttonColor}`}
            >
              {buttonText}
            </button>
          </div>
        </>
      )}

      {/* Lobby state */}
      {state.phase === "lobby" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Music className="h-12 w-12 text-violet-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Ожидание начала игры</h2>
            <p className="text-sm text-muted">
              Ведущий загружает музыкальный бой
            </p>
          </div>
        </div>
      )}

      {/* Scores bar */}
      {state.teams.length > 0 && (
        <div className="border-t border-border bg-surface px-4 py-3">
          <div className="flex justify-around">
            {state.teams.map((t) => (
              <div key={t.id} className="text-center">
                <p className="text-xs text-muted truncate max-w-[80px]">
                  {t.name}
                </p>
                <p
                  className={`text-lg font-bold ${t.id === myTeamId ? "text-violet-600" : "text-foreground"}`}
                >
                  {state.teamScores[t.id] ?? 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Answer Countdown ─── */

function AnswerCountdown({ deadline }: { deadline: number | null }) {
  const [remaining, setRemaining] = useState(7);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, (deadline - Date.now()) / 1000);
      setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;

  const pct = Math.min(100, (remaining / 7) * 100);
  const isLow = remaining < 2;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={isLow ? "text-red-600 font-bold" : "text-muted"}>
          Время на ответ
        </span>
        <span className={`font-mono font-bold ${isLow ? "text-red-600" : ""}`}>
          {remaining.toFixed(1)}с
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${isLow ? "bg-red-500" : "bg-violet-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Admin Score Table ─── */

function AdminScoreTable({
  state,
  onAction,
}: {
  state: GameState;
  onAction: (action: string, extra?: Record<string, unknown>) => Promise<void>;
}) {
  const allPlayers = state.teams.flatMap((t) =>
    t.players.map((p) => ({ ...p, teamId: t.id, teamName: t.name })),
  );

  function getResult(ti: number, qi: number, pid: string): "+" | "-" | null {
    const entry = state.scoreLog.find(
      (e) => e.themeIndex === ti && e.trackIndex === qi && e.playerId === pid,
    );
    return entry?.result ?? null;
  }

  function cycleResult(ti: number, qi: number, pid: string) {
    const current = getResult(ti, qi, pid);
    const next = current === null ? "+" : current === "+" ? "-" : null;
    onAction("score-edit", {
      themeIndex: ti,
      trackIndex: qi,
      playerId: pid,
      result: next,
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface p-5 overflow-x-auto">
      <h3 className="text-sm font-bold mb-3">Таблица результатов</h3>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="px-2 py-1 text-left">Тема / Трек</th>
            {state.teams.map((t) => (
              <th
                key={t.id}
                colSpan={t.players.length || 1}
                className="px-2 py-1 text-center border-l border-border bg-violet-50"
              >
                {t.name}
                <div className="text-[10px] font-normal text-violet-500">
                  {state.teamScores[t.id] ?? 0}
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th className="px-2 py-1" />
            {state.teams.map((t) =>
              t.players.length > 0
                ? t.players.map((p) => (
                    <th
                      key={p.id}
                      className="px-2 py-1 text-center border-l border-border font-normal truncate max-w-[60px]"
                    >
                      {p.name}
                    </th>
                  ))
                : [
                    <th
                      key={`empty-${t.id}`}
                      className="px-2 py-1 border-l border-border"
                    >
                      —
                    </th>,
                  ],
            )}
          </tr>
        </thead>
        <tbody>
          {state.themeNames.map((themeName, ti) =>
            (state.trackValues[ti] ?? []).map((val, qi) => (
              <tr
                key={`${ti}-${qi}`}
                className={`border-b border-border/50 ${
                  ti === state.currentTheme && qi === state.currentTrack
                    ? "bg-violet-50"
                    : ""
                }`}
              >
                <td className="px-2 py-1 whitespace-nowrap">
                  {qi === 0 && (
                    <span className="text-muted mr-1">{themeName}:</span>
                  )}
                  {val}
                </td>
                {allPlayers.map((p) => {
                  const r = getResult(ti, qi, p.id);
                  return (
                    <td
                      key={p.id}
                      onClick={() => cycleResult(ti, qi, p.id)}
                      className={`px-2 py-1 text-center border-l border-border/50 cursor-pointer hover:bg-gray-50 ${
                        r === "+"
                          ? "bg-green-50 text-green-700 font-bold"
                          : r === "-"
                            ? "bg-red-50 text-red-600 font-bold"
                            : ""
                      }`}
                    >
                      {r === "+" ? (
                        <Plus className="h-3 w-3 mx-auto" />
                      ) : r === "-" ? (
                        <Minus className="h-3 w-3 mx-auto" />
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
