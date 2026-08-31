"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

interface ChgkTeamResult {
  id: number;
  name: string;
  town?: { name: string };
}

interface ChgkPlayer {
  id: number;
  surname: string;
  name: string;
  patronymic: string;
}

interface RosterPlayer {
  chgkId?: number | null;
  lastName: string;
  firstName: string;
  patronymic?: string | null;
  isCaptain: boolean;
  isBase: boolean;
  sortOrder: number;
}

export function GuestJoinForm({
  eventId,
  telegramRequired,
  onSuccess,
  heading = "Заявка на синхрон",
  submitLabel = "Заявиться",
  requireRoster = false,
  allowRoster = true,
  copyToEvents = [],
}: {
  eventId: string;
  telegramRequired: boolean;
  onSuccess: () => void;
  heading?: string;
  submitLabel?: string;
  requireRoster?: boolean;
  allowRoster?: boolean;
  copyToEvents?: { id: string; label: string }[];
}) {
  const [manualEntry, setManualEntry] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChgkTeamResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ChgkTeamResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [manualName, setManualName] = useState("");
  const [city, setCity] = useState("");
  const [customName, setCustomName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");

  const [showRoster, setShowRoster] = useState(requireRoster);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [basePlayerIds, setBasePlayerIds] = useState<Set<number>>(new Set());
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<ChgkPlayer[]>([]);
  const [playerSearching, setPlayerSearching] = useState(false);
  const playerSearchRef = useRef<HTMLDivElement>(null);
  const [copyIds, setCopyIds] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (manualEntry || !query.trim() || selectedTeam) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/chgk/search?type=team&q=${encodeURIComponent(query)}`);
        const data: ChgkTeamResult[] = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query, selectedTeam, manualEntry]);

  useEffect(() => {
    if (!playerQuery.trim()) {
      setPlayerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setPlayerSearching(true);
      try {
        const res = await fetch(
          `/api/chgk/search?type=player&q=${encodeURIComponent(playerQuery)}`,
        );
        const data: ChgkPlayer[] = await res.json();
        setPlayerResults(Array.isArray(data) ? data : []);
      } finally {
        setPlayerSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [playerQuery]);

  useEffect(() => {
    if (!selectedTeam) {
      setBasePlayerIds(new Set());
      setPlayers((prev) =>
        prev.map((p) => ({ ...p, isCaptain: false, isBase: false })),
      );
      return;
    }
    let cancelled = false;
    fetch(`/api/chgk/team-players?teamId=${selectedTeam.id}`)
      .then((r) => r.json())
      .then((ids: unknown) => {
        if (cancelled) return;
        const set = new Set(Array.isArray(ids) ? (ids as number[]) : []);
        setBasePlayerIds(set);
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            isCaptain: false,
            isBase: typeof p.chgkId === "number" && set.has(p.chgkId),
          })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setBasePlayerIds(new Set());
        setPlayers((prev) =>
          prev.map((p) => ({ ...p, isCaptain: false, isBase: false })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTeam]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (playerSearchRef.current && !playerSearchRef.current.contains(e.target as Node)) {
        setPlayerResults([]);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function selectTeam(t: ChgkTeamResult) {
    setSelectedTeam(t);
    setQuery(t.name);
    setShowDropdown(false);
    if (!city && t.town?.name) setCity(t.town.name);
    if (customName) setDisplayName(t.name);
  }

  function addPlayer(p: ChgkPlayer) {
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
  }

  function addBlankPlayer() {
    setPlayers((prev) => [
      ...prev,
      {
        lastName: "",
        firstName: "",
        patronymic: null,
        isCaptain: false,
        isBase: false,
        sortOrder: prev.length,
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (telegramRequired && !contactTelegram.trim()) {
      setError("Укажите Telegram для связи");
      return;
    }

    let payload: Record<string, unknown>;
    if (manualEntry) {
      if (!manualName.trim()) {
        setError("Укажите название команды");
        return;
      }
      payload = { manualEntry: true, teamName: manualName.trim(), city: city.trim() };
    } else {
      if (!selectedTeam) {
        setError("Выберите команду из рейтинга или включите ручной ввод");
        return;
      }
      payload = {
        manualEntry: false,
        teamChgkId: selectedTeam.id,
        teamName: selectedTeam.name,
        city: city.trim() || selectedTeam.town?.name || "",
        displayName: customName ? displayName.trim() || null : null,
      };
    }

    payload.contactName = contactName.trim();
    payload.contactEmail = contactEmail.trim();
    payload.contactTelegram = contactTelegram.trim();

    const filledPlayers = players.filter((p) => p.lastName.trim() && p.firstName.trim());
    if (requireRoster && filledPlayers.length === 0) {
      setError("Добавьте хотя бы одного игрока в состав");
      return;
    }
    if ((showRoster || requireRoster) && filledPlayers.length > 0) {
      payload.players = filledPlayers;
    }

    setSubmitting(true);
    try {
      const targets = [eventId, ...[...copyIds].filter((id) => id !== eventId)];
      for (const id of targets) {
        const res = await fetch(`/api/events/${id}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Ошибка");
          return;
        }
      }
      onSuccess();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="page-event-guest-join"
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-accent/20 bg-accent/5 p-5"
    >
      <h3 className="text-sm font-bold">{heading}</h3>

      <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
        <input
          type="checkbox"
          checked={manualEntry}
          onChange={(e) => {
            setManualEntry(e.target.checked);
            setSelectedTeam(null);
            setResults([]);
            setQuery("");
            setCustomName(false);
            setDisplayName("");
          }}
          className="rounded"
        />
        Команды нет на rating.chgk.info — указать название вручную
      </label>

      {!manualEntry ? (
        <div ref={searchRef} className="relative">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Команда
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30">
            {searching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-muted" />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selectedTeam) setSelectedTeam(null);
              }}
              placeholder="Название или ID команды на rating.chgk.info"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
            {(query || selectedTeam) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedTeam(null);
                  setCustomName(false);
                  setDisplayName("");
                }}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {showDropdown && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
              {results.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTeam(t)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface/80"
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted">
                    #{t.id}
                    {t.town ? ` · ${t.town.name}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Название команды
          </label>
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
      )}

      {selectedTeam && !manualEntry && (
        <div>
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={customName}
              onChange={(e) => {
                setCustomName(e.target.checked);
                if (e.target.checked && !displayName) setDisplayName(selectedTeam.name);
              }}
              className="rounded"
            />
            Разовое название
          </label>
          {customName && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Разовое название команды..."
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Город
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Имя представителя
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Telegram {telegramRequired ? "*" : ""}
          </label>
          <input
            type="text"
            value={contactTelegram}
            onChange={(e) => setContactTelegram(e.target.value)}
            placeholder="@username"
            required={telegramRequired}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
      </div>

      {(allowRoster || requireRoster) && (
      <div>
        {!requireRoster && (
          <button
            type="button"
            onClick={() => setShowRoster((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <UserPlus className="h-4 w-4" />
            {showRoster ? "Скрыть предварительный состав" : "Предварительный состав (необязательно)"}
          </button>
        )}
        {requireRoster && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Состав команды
          </p>
        )}
        {(showRoster || requireRoster) && (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-surface p-3">
            <div ref={playerSearchRef} className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                {playerSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                ) : (
                  <Search className="h-4 w-4 text-muted" />
                )}
                <input
                  type="text"
                  value={playerQuery}
                  onChange={(e) => setPlayerQuery(e.target.value)}
                  placeholder="Найти игрока по имени или ID"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              {playerResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                  {playerResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPlayer(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80"
                    >
                      <span>
                        {p.surname} {p.name} {p.patronymic}
                      </span>
                      <span className="text-xs text-muted">#{p.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {players.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={p.lastName}
                  onChange={(e) =>
                    setPlayers((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, lastName: e.target.value } : x)),
                    )
                  }
                  placeholder="Фамилия"
                  className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                />
                <input
                  value={p.firstName}
                  onChange={(e) =>
                    setPlayers((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, firstName: e.target.value } : x)),
                    )
                  }
                  placeholder="Имя"
                  className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                />
                {p.isBase ? (
                  <span className="shrink-0 text-[10px] font-bold text-blue-700" title="Базовый состав">
                    Б
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold text-amber-600" title="Легионер">
                    Л
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPlayers((prev) => prev.filter((_, i) => i !== idx))}
                  className="shrink-0 text-muted hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addBlankPlayer}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Игрок без ID рейтинга
            </button>
          </div>
        )}
      </div>
      )}

      {copyToEvents.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Также подать этот состав на синхроны
          </p>
          {copyToEvents.map((ev) => (
            <label key={ev.id} className="flex cursor-pointer items-start gap-2 text-sm select-none">
              <input
                type="checkbox"
                checked={copyIds.has(ev.id)}
                onChange={(e) => {
                  setCopyIds((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(ev.id);
                    else next.delete(ev.id);
                    return next;
                  });
                }}
                className="mt-0.5 rounded"
              />
              <span>{ev.label}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {submitLabel}
      </button>
    </form>
  );
}
