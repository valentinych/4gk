"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Crown,
  Star,
  Users,
} from "lucide-react";

interface ChgkPlayer {
  id: number;
  surname: string;
  name: string;
  patronymic: string;
}

interface RosterPlayer {
  id?: string;
  chgkId?: number | null;
  lastName: string;
  firstName: string;
  patronymic?: string | null;
  isCaptain: boolean;
  isBase: boolean;
  sortOrder: number;
}

interface RosterEvent {
  id: string;
  title: string;
  startDate: string;
  city: string;
}

interface InitialRoster {
  teamName: string;
  teamChgkId: number | null;
  city: string | null;
  players: RosterPlayer[];
}

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function RosterForm({
  eventId,
  event,
  initialRoster,
}: {
  eventId: string;
  event: RosterEvent | null;
  initialRoster: InitialRoster | null;
}) {
  const router = useRouter();

  const [teamName, setTeamName] = useState(initialRoster?.teamName ?? "");
  const [teamChgkId, setTeamChgkId] = useState<number | null>(initialRoster?.teamChgkId ?? null);
  const [city, setCity] = useState(initialRoster?.city ?? "");
  const [players, setPlayers] = useState<RosterPlayer[]>(initialRoster?.players ?? []);
  const [existing, setExisting] = useState(initialRoster != null);

  // Base player IDs for the selected team
  const [basePlayerIds, setBasePlayerIds] = useState<Set<number>>(new Set());
  const [baseLoading, setBaseLoading] = useState(false);

  // Team search
  const [teamQuery, setTeamQuery] = useState("");
  const debouncedTeamQuery = useDebounce(teamQuery, 400);
  const [teamResults, setTeamResults] = useState<{ id: number; name: string; town?: { name: string } }[]>([]);
  const [teamSearching, setTeamSearching] = useState(false);

  // Player search
  const [playerQuery, setPlayerQuery] = useState("");
  const debouncedPlayerQuery = useDebounce(playerQuery, 400);
  const [playerResults, setPlayerResults] = useState<ChgkPlayer[]>([]);
  const [playerSearching, setPlayerSearching] = useState(false);
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const playerSearchRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch base player IDs whenever teamChgkId changes
  useEffect(() => {
    if (!teamChgkId) { setBasePlayerIds(new Set()); return; }
    setBaseLoading(true);
    fetch(`/api/chgk/team-players?teamId=${teamChgkId}`)
      .then((r) => r.json())
      .then((ids: number[]) => {
        const s = new Set(ids);
        setBasePlayerIds(s);
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            isBase: p.chgkId != null ? s.has(p.chgkId) : p.isBase,
          })),
        );
      })
      .catch(() => setBasePlayerIds(new Set()))
      .finally(() => setBaseLoading(false));
  }, [teamChgkId]);

  // Team search
  useEffect(() => {
    if (!debouncedTeamQuery.trim()) { setTeamResults([]); return; }
    setTeamSearching(true);
    fetch(`/api/chgk/search?type=team&q=${encodeURIComponent(debouncedTeamQuery)}`)
      .then((r) => r.json())
      .then(setTeamResults)
      .catch(() => setTeamResults([]))
      .finally(() => setTeamSearching(false));
  }, [debouncedTeamQuery]);

  // Player search
  useEffect(() => {
    if (!debouncedPlayerQuery.trim()) { setPlayerResults([]); return; }
    setPlayerSearching(true);
    fetch(`/api/chgk/search?type=player&q=${encodeURIComponent(debouncedPlayerQuery)}`)
      .then((r) => r.json())
      .then(setPlayerResults)
      .catch(() => setPlayerResults([]))
      .finally(() => setPlayerSearching(false));
  }, [debouncedPlayerQuery]);

  // Close player search dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (playerSearchRef.current && !playerSearchRef.current.contains(e.target as Node)) {
        setShowPlayerSearch(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addPlayerFromSearch = useCallback(
    (p: ChgkPlayer) => {
      if (players.some((pl) => pl.chgkId === p.id)) return;
      setPlayers((prev) => [
        ...prev,
        {
          chgkId: p.id,
          lastName: p.surname,
          firstName: p.name,
          patronymic: p.patronymic || null,
          isCaptain: false,
          isBase: basePlayerIds.has(p.id),
          sortOrder: prev.length,
        },
      ]);
      setPlayerQuery("");
      setPlayerResults([]);
      setShowPlayerSearch(false);
    },
    [players, basePlayerIds],
  );

  const addBlankPlayer = () => {
    setPlayers((prev) => [
      ...prev,
      { lastName: "", firstName: "", patronymic: null, isCaptain: false, isBase: false, sortOrder: prev.length },
    ]);
  };

  const removePlayer = (idx: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sortOrder: i })));
  };

  const updatePlayer = (idx: number, patch: Partial<RosterPlayer>) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const movePlayer = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= players.length) return;
    setPlayers((prev) => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((p, i) => ({ ...p, sortOrder: i }));
    });
  };

  const setCaptain = (idx: number) => {
    setPlayers((prev) =>
      prev.map((p, i) => ({ ...p, isCaptain: i === idx ? !p.isCaptain : false })),
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!teamName.trim()) { setError("Укажите название команды"); return; }
    if (!players.length) { setError("Добавьте хотя бы одного игрока"); return; }
    const hasEmpty = players.some((p) => !p.lastName.trim() || !p.firstName.trim());
    if (hasEmpty) { setError("Заполните фамилию и имя для каждого игрока"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/roster/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName, teamChgkId, city, players }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Ошибка сохранения");
      }
      setSaved(true);
      setExisting(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Удалить заявку команды?")) return;
    await fetch(`/api/roster/${eventId}`, { method: "DELETE" });
    router.push("/account");
  };

  if (!event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-muted">Турнир не найден</p>
        <Link href="/calendar" className="mt-4 text-sm text-accent underline">Календарь</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/calendar"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Назад в календарь
      </Link>

      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">Подача состава</h1>
          <p className="mt-0.5 text-sm text-muted">{event.title}</p>
          <p className="text-xs text-muted">
            {new Date(event.startDate).toLocaleDateString("ru-RU", {
              day: "numeric", month: "long", year: "numeric",
            })}, {event.city}
          </p>
        </div>
      </div>

      {existing && !saved && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Состав уже подан — вы можете обновить его
        </div>
      )}

      {/* Team section */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Команда</h2>
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Поиск по рейтингу ЧГК (по названию или ID команды)
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Название команды или ID..."
                value={teamQuery}
                onChange={(e) => setTeamQuery(e.target.value)}
                className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
              />
              {teamSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
              )}
            </div>
            {teamResults.length > 0 && (
              <ul className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-white shadow-md">
                {teamResults.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTeamName(t.name);
                        setTeamChgkId(t.id);
                        setCity(t.town?.name ?? city);
                        setTeamQuery("");
                        setTeamResults([]);
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface"
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-muted">#{t.id}{t.town ? ` · ${t.town.name}` : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Название команды <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Введите название"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Город</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Город команды"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {teamChgkId && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>
                ID команды: <span className="font-mono font-medium">{teamChgkId}</span>
              </span>
              {baseLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {!baseLoading && basePlayerIds.size > 0 && (
                <span className="text-emerald-600">
                  · базовый состав: {basePlayerIds.size} игр.
                </span>
              )}
              <button
                type="button"
                onClick={() => { setTeamChgkId(null); setBasePlayerIds(new Set()); }}
                className="ml-auto text-danger hover:underline"
              >
                сбросить
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Players section */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Игроки ({players.length})
          </h2>
          <span className="text-xs text-muted">
            <Crown className="mr-0.5 inline h-3 w-3 text-amber-500" /> — капитан&ensp;
            <Star className="mr-0.5 inline h-3 w-3 text-blue-500" /> — базовый состав
          </span>
        </div>

        <div ref={playerSearchRef} className="relative mb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Поиск по фамилии или ID игрока..."
              value={playerQuery}
              onChange={(e) => { setPlayerQuery(e.target.value); setShowPlayerSearch(true); }}
              onFocus={() => setShowPlayerSearch(true)}
              className="w-full rounded-xl border border-border py-2.5 pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
            />
            {playerSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
            )}
          </div>
          {showPlayerSearch && playerResults.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
              {playerResults.map((p) => {
                const alreadyAdded = players.some((pl) => pl.chgkId === p.id);
                const isBase = basePlayerIds.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addPlayerFromSearch(p)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface disabled:opacity-40"
                    >
                      <span className="flex items-center gap-2">
                        <span>
                          <span className="font-medium">{p.surname} {p.name}</span>
                          {p.patronymic ? <span className="text-muted"> {p.patronymic}</span> : null}
                        </span>
                        {isBase && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                            <Star className="h-2.5 w-2.5" /> база
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted">
                        #{p.id}{alreadyAdded ? " · уже добавлен" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          {players.map((p, idx) => (
            <div
              key={idx}
              className="group rounded-xl border border-border bg-white p-3 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => movePlayer(idx, -1)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-muted transition-colors hover:text-foreground disabled:opacity-20"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-center text-xs font-mono text-muted">{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => movePlayer(idx, 1)}
                    disabled={idx === players.length - 1}
                    className="rounded p-0.5 text-muted transition-colors hover:text-foreground disabled:opacity-20"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Фамилия *"
                      value={p.lastName}
                      onChange={(e) => updatePlayer(idx, { lastName: e.target.value })}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Имя *"
                      value={p.firstName}
                      onChange={(e) => updatePlayer(idx, { firstName: e.target.value })}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Отчество"
                      value={p.patronymic ?? ""}
                      onChange={(e) => updatePlayer(idx, { patronymic: e.target.value || null })}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {p.chgkId && (
                      <span className="text-xs font-mono text-muted">ID: {p.chgkId}</span>
                    )}
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={p.isCaptain}
                        onChange={() => setCaptain(idx)}
                        className="h-3.5 w-3.5 accent-amber-500"
                      />
                      <Crown className="h-3 w-3 text-amber-500" />
                      Капитан
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={p.isBase}
                        onChange={() => updatePlayer(idx, { isBase: !p.isBase })}
                        className="h-3.5 w-3.5 accent-blue-500"
                      />
                      <Star className="h-3 w-3 text-blue-500" />
                      Базовый состав
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removePlayer(idx)}
                  className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addBlankPlayer}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Plus className="h-4 w-4" />
          Добавить игрока вручную
        </button>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Состав сохранён!
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {existing ? "Обновить состав" : "Подать состав"}
        </button>

        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Отозвать заявку
          </button>
        )}
      </div>
    </div>
  );
}
