"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ExternalLink,
  Users,
  Search,
  X,
  Loader2,
  Trash2,
  CheckCircle2,
  LogIn,
  Megaphone,
  UserPlus,
} from "lucide-react";
import { getCityColor } from "@/data/calendar";

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const TYPE_LABELS: Record<string, string> = {
  "multi-day": "Многодневный",
  "one-day": "Однодневный",
  "sync-chgk": "Синхрон ЧГК",
  "si": "ИСИ",
  "brain-ring": "Брейн-Ринг",
  "other": "Другое",
  tournament: "Турнир",
  sync: "Синхрон",
  league: "Лига",
};

function parseDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(
  start: string,
  end?: string | null,
  startTime?: string | null,
  endTime?: string | null,
) {
  const s = parseDate(start);
  const e = end ? parseDate(end) : null;
  const sameDay = !e || s.getTime() === e.getTime();

  if (sameDay) {
    let result = `${s.getDate()} ${MONTHS_GEN[s.getMonth()]} ${s.getFullYear()}`;
    if (startTime) {
      result += ` · ${startTime}`;
      if (endTime) result += `–${endTime}`;
    }
    return result;
  }

  const sameMonth = e && s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) return `${s.getDate()}–${e!.getDate()} ${MONTHS_GEN[s.getMonth()]} ${s.getFullYear()}`;
  return `${s.getDate()} ${MONTHS_GEN[s.getMonth()]} – ${e!.getDate()} ${MONTHS_GEN[e!.getMonth()]} ${e!.getFullYear()}`;
}

interface EventData {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  city: string;
  venue?: string | null;
  venueMapUrl?: string | null;
  description?: string | null;
  registrationLink?: string | null;
  mediaLink?: string | null;
  mediaLinkLabel?: string | null;
}

interface TeamEntry {
  id: string;
  teamChgkId: number;
  teamName: string;
  displayName: string | null;
  addedBy: string;
  addedAt: string;
}

interface ChgkTeamResult {
  id: number;
  name: string;
  town?: { name: string };
}

function teamCountWord(n: number) {
  if (n % 100 >= 11 && n % 100 <= 19) return "команд";
  const r = n % 10;
  if (r === 1) return "команда";
  if (r >= 2 && r <= 4) return "команды";
  return "команд";
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";

  const [event, setEvent] = useState<EventData | null>(null);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  /* ─── Admin: add team ─── */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChgkTeamResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ChgkTeamResult | null>(null);
  const [adminCustomName, setAdminCustomName] = useState(false);
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  /* ─── Player: join ─── */
  const [joinPhase, setJoinPhase] = useState<"idle" | "loading" | "preview" | "submitting">("idle");
  const [myTeam, setMyTeam] = useState<{ teamChgkId: number; teamName: string } | null>(null);
  const [joinCustomName, setJoinCustomName] = useState(false);
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  /* ─── Remove ─── */
  const [removing, setRemoving] = useState<string | null>(null);

  /* ─── Load page data ─── */
  const loadTeams = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/teams`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvent(data.event);
      setTeams(data.teams);
    } catch {
      setPageError("Не удалось загрузить событие");
    } finally {
      setPageLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  /* ─── Search debounce ─── */
  useEffect(() => {
    if (!searchQuery.trim() || selectedTeam) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/chgk/search?type=team&q=${encodeURIComponent(searchQuery)}`);
        const data: ChgkTeamResult[] = await res.json();
        setSearchResults(data);
        setShowDropdown(data.length > 0);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, selectedTeam]);

  /* ─── Close dropdown on outside click ─── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectTeam(t: ChgkTeamResult) {
    setSelectedTeam(t);
    setSearchQuery(t.name);
    setShowDropdown(false);
    setAdminCustomName(false);
    setAdminDisplayName("");
    setAddError(null);
  }

  function clearSelected() {
    setSelectedTeam(null);
    setSearchQuery("");
    setSearchResults([]);
    setAdminCustomName(false);
    setAdminDisplayName("");
    setAddError(null);
  }

  async function handleAdd() {
    if (!selectedTeam) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamChgkId: selectedTeam.id,
          teamName: selectedTeam.name,
          displayName: adminCustomName ? adminDisplayName : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Ошибка"); return; }
      setTeams((prev) => [...prev, data]);
      clearSelected();
    } finally {
      setAdding(false);
    }
  }

  async function handleJoinStart() {
    setJoinPhase("loading");
    setJoinError(null);
    try {
      const res = await fetch("/api/account/chgk/profile");
      if (!res.ok) {
        const d = await res.json();
        setJoinError(d.error ?? "Ошибка получения профиля");
        setJoinPhase("idle");
        return;
      }
      const d = await res.json();
      if (!d.currentTeam) {
        setJoinError("Не удалось определить текущую команду в рейтинге ЧГКÄ. Убедитесь, что вы состоите в команде.");
        setJoinPhase("idle");
        return;
      }
      setMyTeam({ teamChgkId: d.currentTeam.id, teamName: d.currentTeam.name });
      setJoinCustomName(false);
      setJoinDisplayName(d.currentTeam.name);
      setJoinPhase("preview");
    } catch {
      setJoinError("Ошибка сети");
      setJoinPhase("idle");
    }
  }

  async function handleJoinConfirm() {
    if (!myTeam) return;
    setJoinPhase("submitting");
    setJoinError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: joinCustomName ? joinDisplayName.trim() || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? "Ошибка");
        setJoinPhase("preview");
        return;
      }
      setTeams((prev) => [...prev, data]);
      setJoinPhase("idle");
      setMyTeam(null);
    } catch {
      setJoinError("Ошибка сети");
      setJoinPhase("preview");
    }
  }

  function cancelJoin() {
    setJoinPhase("idle");
    setMyTeam(null);
    setJoinError(null);
    setJoinCustomName(false);
  }

  async function handleRemove(teamId: string) {
    setRemoving(teamId);
    try {
      await fetch(`/api/events/${eventId}/teams/${teamId}`, { method: "DELETE" });
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } finally {
      setRemoving(null);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (pageError || !event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted">{pageError ?? "Событие не найдено"}</p>
        <Link href="/calendar" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Назад к календарю
        </Link>
      </div>
    );
  }

  const c = getCityColor(event.city);
  const myEntry = userId ? teams.find((t) => t.addedBy === userId) : undefined;
  const alreadyJoined = !!myEntry;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Back */}
      <Link
        href="/calendar"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Календарь
      </Link>

      {/* Event header */}
      <div className="mb-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${c.bg} ${c.text} ${c.border}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
            {event.city}
          </span>
          <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
            {TYPE_LABELS[event.type] ?? event.type}
          </span>
        </div>

        <h1 className="mb-4 text-2xl font-bold tracking-tight">{event.title}</h1>

        {event.description && (
          <p className="mb-4 text-sm leading-relaxed text-muted">{event.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatDate(event.startDate, event.endDate, event.startTime, event.endTime)}
          </span>
          {event.venue && (
            event.venueMapUrl ? (
              <a
                href={event.venueMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 underline decoration-muted/30 underline-offset-2 hover:text-foreground"
              >
                <MapPin className="h-4 w-4" />
                {event.venue}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.venue}
              </span>
            )
          )}
        </div>

        {(event.registrationLink || event.mediaLink) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.registrationLink && (
              <a
                href={event.registrationLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface ${c.text} ${c.border}`}
              >
                Регистрация <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {event.mediaLink && (
              <a
                href={event.mediaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <Megaphone className="h-3 w-3" />
                {event.mediaLinkLabel || "Медиа"} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Teams section */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <h2 className="font-bold">Команды</h2>
            {teams.length > 0 && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                {teams.length}
              </span>
            )}
          </div>
        </div>

        {/* ─── Admin/Organizer: add team ─── */}
        {isOrganizer && (
          <div className="border-b border-border px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Добавить команду
            </p>

            <div className="space-y-3">
              {/* Search */}
              <div ref={searchRef} className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30">
                  {searchLoading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" />
                  ) : (
                    <Search className="h-4 w-4 shrink-0 text-muted" />
                  )}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedTeam) setSelectedTeam(null);
                    }}
                    placeholder="Название или ID команды..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
                  />
                  {(searchQuery || selectedTeam) && (
                    <button onClick={clearSelected} className="text-muted hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                    {searchResults.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTeam(t)}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface"
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted">
                          #{t.id}{t.town ? ` · ${t.town.name}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected team preview + displayName */}
              {selectedTeam && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{selectedTeam.name}</span>
                    <a
                      href={`https://rating.chgk.info/teams/${selectedTeam.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      #{selectedTeam.id}
                    </a>
                  </div>

                  {/* Разовое название */}
                  <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
                    <input
                      type="checkbox"
                      checked={adminCustomName}
                      onChange={(e) => {
                        setAdminCustomName(e.target.checked);
                        if (e.target.checked && !adminDisplayName) setAdminDisplayName(selectedTeam.name);
                      }}
                      className="rounded"
                    />
                    Разовое название
                  </label>

                  {adminCustomName && (
                    <input
                      type="text"
                      value={adminDisplayName}
                      onChange={(e) => setAdminDisplayName(e.target.value)}
                      placeholder="Разовое название команды..."
                      className="mb-2 w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                  )}

                  {addError && <p className="mb-2 text-xs text-red-600">{addError}</p>}

                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Добавить
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Player: join ─── */}
        {!isOrganizer && userId && (
          <div className="border-b border-border px-5 py-4">
            {alreadyJoined ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Ваша команда зарегистрирована:{" "}
                  <strong>{myEntry?.displayName ?? myEntry?.teamName}</strong>
                </span>
                <button
                  onClick={() => handleRemove(myEntry!.id)}
                  disabled={removing === myEntry?.id}
                  className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {removing === myEntry?.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  Отменить
                </button>
              </div>
            ) : joinPhase === "idle" ? (
              <div>
                <button
                  onClick={handleJoinStart}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <UserPlus className="h-4 w-4" />
                  Присоединиться
                </button>
                {joinError && <p className="mt-2 text-xs text-red-600">{joinError}</p>}
              </div>
            ) : joinPhase === "loading" ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загружаем информацию о вашей команде...
              </div>
            ) : joinPhase === "preview" || joinPhase === "submitting" ? (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Ваша команда
                </p>
                <p className="mb-3 text-sm font-bold">{myTeam?.teamName}</p>

                <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
                  <input
                    type="checkbox"
                    checked={joinCustomName}
                    onChange={(e) => {
                      setJoinCustomName(e.target.checked);
                      if (e.target.checked && !joinDisplayName) setJoinDisplayName(myTeam?.teamName ?? "");
                    }}
                    className="rounded"
                  />
                  Разовое название
                </label>

                {joinCustomName && (
                  <input
                    type="text"
                    value={joinDisplayName}
                    onChange={(e) => setJoinDisplayName(e.target.value)}
                    placeholder="Разовое название..."
                    className="mb-3 w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                )}

                {joinError && <p className="mb-2 text-xs text-red-600">{joinError}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={handleJoinConfirm}
                    disabled={joinPhase === "submitting"}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {joinPhase === "submitting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Подтвердить
                  </button>
                  <button
                    onClick={cancelJoin}
                    disabled={joinPhase === "submitting"}
                    className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ─── Not logged in ─── */}
        {!userId && (
          <div className="border-b border-border px-5 py-4">
            <Link
              href={`/auth/signin?callbackUrl=/calendar/${event.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <LogIn className="h-4 w-4" />
              Войдите, чтобы присоединиться
            </Link>
          </div>
        )}

        {/* ─── Teams list ─── */}
        {teams.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted/30" />
            <p className="text-sm text-muted">Пока нет зарегистрированных команд</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium w-10">#</th>
                  <th className="px-5 py-2.5 font-medium">Команда</th>
                  <th className="px-5 py-2.5 font-medium w-20 text-right">ID</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teams.map((team, idx) => {
                  const displayName = team.displayName ?? team.teamName;
                  const hasCustom = !!team.displayName && team.displayName !== team.teamName;
                  const canRemove = isOrganizer || team.addedBy === userId;
                  return (
                    <tr key={team.id} className="hover:bg-surface/40">
                      <td className="px-5 py-3 font-mono text-xs text-muted">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <span className="font-medium">{displayName}</span>
                        {hasCustom && (
                          <span className="ml-2 text-xs text-muted">({team.teamName})</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a
                          href={`https://rating.chgk.info/teams/${team.teamChgkId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline"
                        >
                          #{team.teamChgkId}
                        </a>
                      </td>
                      <td className="pr-3">
                        {canRemove && (
                          <button
                            onClick={() => handleRemove(team.id)}
                            disabled={removing === team.id}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
                            title="Удалить"
                          >
                            {removing === team.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {teams.length > 0 && (
          <div className="border-t border-border px-5 py-3 text-xs text-muted">
            {teams.length} {teamCountWord(teams.length)}
          </div>
        )}
      </div>
    </div>
  );
}
