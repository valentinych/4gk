"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Zap,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Users,
  Play,
} from "lucide-react";

interface RoomInfo {
  code: string;
  createdAt: number;
  playerCount?: number;
  hasPackage?: boolean;
  packageTitle?: string | null;
  alive?: boolean;
}

export default function BuzzerPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const canCreateGames = role === "ADMIN" || role === "MODERATOR" || role === "ORGANIZER";
  const isLoading = status === "loading";

  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("buzzer_player_name");
    if (saved) setJoinName(saved);
  }, []);

  const loadRooms = useCallback(async () => {
    const raw = localStorage.getItem("buzzer_my_rooms");
    if (!raw) return;
    try {
      const stored: RoomInfo[] = JSON.parse(raw);
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const recent = stored.filter((r) => r.createdAt > twoHoursAgo);

      const checked = await Promise.all(
        recent.map(async (r) => {
          try {
            const res = await fetch(`/api/buzzer/${r.code}/status`);
            if (!res.ok) return { ...r, alive: false };
            const data = await res.json();
            return {
              ...r,
              alive: data.exists,
              playerCount: data.playerCount,
              hasPackage: data.hasPackage,
              packageTitle: data.packageTitle,
            };
          } catch {
            return { ...r, alive: false };
          }
        }),
      );

      const alive = checked.filter((r) => r.alive);
      localStorage.setItem("buzzer_my_rooms", JSON.stringify(alive));
      setRooms(alive);
    } catch {
      localStorage.removeItem("buzzer_my_rooms");
    }
  }, []);

  useEffect(() => {
    if (canCreateGames) loadRooms();
  }, [canCreateGames, loadRooms]);

  function saveRoom(code: string) {
    const raw = localStorage.getItem("buzzer_my_rooms");
    const list: RoomInfo[] = raw ? JSON.parse(raw) : [];
    list.unshift({ code, createdAt: Date.now() });
    localStorage.setItem("buzzer_my_rooms", JSON.stringify(list));
  }

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/buzzer/create", { method: "POST" });
      const { code, adminToken } = await res.json();
      localStorage.setItem(`buzzer_admin_${code}`, adminToken);
      saveRoom(code);
      router.push(`/buzzer/${code}`);
    } catch {
      setError("Не удалось создать игру");
      setCreating(false);
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    const name = joinName.trim();
    if (!code || !name) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/buzzer/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Game not found");
      const { playerId } = await res.json();
      localStorage.setItem(`buzzer_player_${code}`, playerId);
      localStorage.setItem("buzzer_player_name", name);
      router.push(`/buzzer/${code}`);
    } catch {
      setError("Игра не найдена");
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-20">
      <Link
        href="/online-games"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Онлайн-игры
      </Link>

      <div className="text-center mb-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500 shadow-lg">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Кнопка СИ
        </h1>
        <p className="mt-2 text-sm text-muted">
          Система кнопок для игры в «Свою игру»
        </p>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="rounded-xl border border-border bg-white p-6 text-center">
            <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : canCreateGames ? (
          <>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="group w-full rounded-xl border-2 border-dashed border-border bg-white p-6 text-center transition-all hover:border-accent/40 hover:shadow-md disabled:opacity-60"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Plus className="h-5 w-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {creating ? "Создаём..." : "Создать комнату"}
                  </p>
                  <p className="text-xs text-muted">
                    Вы будете ведущим и сможете управлять кнопками
                  </p>
                </div>
              </div>
            </button>

            {rooms.length > 0 && (
              <div className="rounded-xl border border-border bg-white p-5">
                <h2 className="text-sm font-bold mb-3">Ваши комнаты</h2>
                <div className="space-y-2">
                  {rooms.map((r) => (
                    <Link
                      key={r.code}
                      href={`/buzzer/${r.code}`}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-surface/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Play className="h-4 w-4 text-accent" />
                        <div>
                          <span className="text-sm font-mono font-bold tracking-wider">
                            {r.code}
                          </span>
                          {r.packageTitle && (
                            <p className="text-xs text-muted truncate max-w-[200px]">
                              {r.packageTitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Users className="h-3 w-3" />
                        {r.playerCount ?? 0}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Создание комнат доступно только администраторам
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Вы можете присоединиться к существующей игре по коду от
                  ведущего.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--background)] px-3 text-xs text-muted">
              {canCreateGames ? "или" : "присоединиться"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-sm font-bold mb-4">Войти в игру по коду</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Код игры
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  )
                }
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.3em] placeholder:tracking-[0.3em] placeholder:text-muted/30 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Ваше имя
              </label>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Как вас зовут?"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={
                joining || joinCode.trim().length < 4 || !joinName.trim()
              }
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {joining ? "Подключаемся..." : "Войти в игру"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
