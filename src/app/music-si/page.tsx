"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Music,
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
  teamCount?: number;
  alive?: boolean;
}

export default function MusicSIPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const canCreate =
    role === "ADMIN" || role === "MODERATOR" || role === "ORGANIZER";
  const isLoading = status === "loading";

  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  const [teamList, setTeamList] = useState<
    { id: string; name: string; players: { id: string; name: string }[] }[]
  >([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("music_player_name");
    if (saved) setJoinName(saved);
  }, []);

  const loadRooms = useCallback(async () => {
    const raw = localStorage.getItem("music_my_rooms");
    if (!raw) return;
    try {
      const stored: RoomInfo[] = JSON.parse(raw);
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const recent = stored.filter((r) => r.createdAt > twoHoursAgo);

      const checked = await Promise.all(
        recent.map(async (r) => {
          try {
            const res = await fetch(`/api/music-si/${r.code}/status`);
            if (!res.ok) return { ...r, alive: false };
            const data = await res.json();
            return {
              ...r,
              alive: data.exists,
              playerCount: data.playerCount,
              teamCount: data.teamCount,
            };
          } catch {
            return { ...r, alive: false };
          }
        }),
      );

      const alive = checked.filter((r) => r.alive);
      localStorage.setItem("music_my_rooms", JSON.stringify(alive));
      setRooms(alive);
    } catch {
      localStorage.removeItem("music_my_rooms");
    }
  }, []);

  useEffect(() => {
    if (canCreate) loadRooms();
  }, [canCreate, loadRooms]);

  function saveRoom(code: string) {
    const raw = localStorage.getItem("music_my_rooms");
    const list: RoomInfo[] = raw ? JSON.parse(raw) : [];
    list.unshift({ code, createdAt: Date.now() });
    localStorage.setItem("music_my_rooms", JSON.stringify(list));
  }

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/music-si/create", { method: "POST" });
      const { code, adminToken } = await res.json();
      localStorage.setItem(`music_admin_${code}`, adminToken);
      saveRoom(code);
      router.push(`/music-si/${code}`);
    } catch {
      setError("Не удалось создать игру");
      setCreating(false);
    }
  }

  async function fetchTeams() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    setError("");
    try {
      const res = await fetch(`/api/music-si/${code}/events`);
      if (!res.ok) throw new Error();
      const reader = res.body?.getReader();
      if (!reader) throw new Error();
      const { value } = await reader.read();
      reader.cancel();
      const text = new TextDecoder().decode(value);
      const match = text.match(/^data: (.+)$/m);
      if (!match) throw new Error();
      const state = JSON.parse(match[1]);
      setTeamList(state.teams || []);
      if (state.teams?.length > 0) {
        setSelectedTeam(state.teams[0].id);
        setShowTeamPicker(true);
      } else {
        setError("В этой игре пока нет команд");
      }
    } catch {
      setError("Игра не найдена");
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    const name = joinName.trim();
    if (!code || !name || !selectedTeam) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/music-si/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, teamId: selectedTeam }),
      });
      if (!res.ok) throw new Error();
      const { playerId } = await res.json();
      localStorage.setItem(`music_player_${code}`, playerId);
      localStorage.setItem(`music_team_${code}`, selectedTeam);
      localStorage.setItem("music_player_name", name);
      router.push(`/music-si/${code}`);
    } catch {
      setError("Не удалось присоединиться");
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 shadow-lg">
          <Music className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Music SI
        </h1>
        <p className="mt-2 text-sm text-muted">
          Музыкальная «Своя игра» по командам
        </p>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : canCreate ? (
          <>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="group w-full rounded-xl border-2 border-dashed border-border bg-surface p-6 text-center transition-all hover:border-violet-300 hover:shadow-md disabled:opacity-60"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 group-hover:bg-violet-200 transition-colors">
                  <Plus className="h-5 w-5 text-violet-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {creating ? "Создаём..." : "Создать комнату"}
                  </p>
                  <p className="text-xs text-muted">
                    Вы будете ведущим музыкальной игры
                  </p>
                </div>
              </div>
            </button>

            {rooms.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h2 className="text-sm font-bold mb-3">Ваши комнаты</h2>
                <div className="space-y-2">
                  {rooms.map((r) => (
                    <Link
                      key={r.code}
                      href={`/music-si/${r.code}`}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-surface/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Play className="h-4 w-4 text-violet-600" />
                        <span className="text-sm font-mono font-bold tracking-wider">
                          {r.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.playerCount ?? 0}
                        </span>
                        <span>{r.teamCount ?? 0} команд</span>
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
                  Создание игр доступно только администраторам
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Вы можете присоединиться к игре по коду от ведущего.
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
              {canCreate ? "или" : "присоединиться"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-bold mb-4">Войти в игру по коду</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Код игры
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                  setShowTeamPicker(false);
                }}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.3em] placeholder:tracking-[0.3em] placeholder:text-muted/30 focus:border-accent focus:outline-none"
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
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            {!showTeamPicker ? (
              <button
                onClick={fetchTeams}
                disabled={joinCode.trim().length < 4 || !joinName.trim()}
                className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Найти игру
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Выберите команду
                  </label>
                  <div className="space-y-1.5">
                    {teamList.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTeam(t.id)}
                        className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                          selectedTeam === t.id
                            ? "border-violet-400 bg-violet-50 font-bold text-violet-700"
                            : "border-border hover:bg-surface"
                        }`}
                      >
                        <span className="font-semibold">{t.name}</span>
                        <span className="ml-2 text-xs text-muted">
                          ({t.players.length} игроков)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleJoin}
                  disabled={joining || !selectedTeam}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {joining ? "Подключаемся..." : "Войти в игру"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
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
