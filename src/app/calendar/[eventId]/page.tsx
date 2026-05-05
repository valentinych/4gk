"use client";

import { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { formatWarsawDateTime } from "@/lib/time";
import { useToast } from "@/components/Toaster";
import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  ratingUrl?: string | null;
  mediaLink?: string | null;
  mediaLinkLabel?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  participantLimit?: number | null;
  closeOnLimit?: boolean | null;
}

interface TeamEntry {
  id: string;
  teamChgkId: number;
  teamName: string;
  hasRoster: boolean;
  playersCount: number | null;
  displayName: string | null;
  addedBy: string;
  addedAt: string;
  withdrawnAt: string | null;
  isReserve: boolean;
}

interface ChgkTeamResult {
  id: number;
  name: string;
  town?: { name: string };
}

/* ─── Inline editable players-count cell ─── */
function PlayersCountInput({
  eventId,
  teamId,
  value,
  onChange,
}: {
  eventId: string;
  teamId: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [local, setLocal] = useState(value != null ? String(value) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSavedFlag] = useState(false);
  const prevRef = useRef(value);

  async function commit(raw: string) {
    const num = raw.trim() === "" ? null : parseInt(raw, 10);
    const next = num != null && !isNaN(num) && num >= 0 ? num : null;
    if (next === prevRef.current) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playersCount: next }),
      });
      if (res.ok) {
        prevRef.current = next;
        onChange(next);
        setLocal(next != null ? String(next) : "");
        setSavedFlag(true);
        setTimeout(() => setSavedFlag(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <input
        type="number"
        min={0}
        max={999}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="—"
        className={`w-14 rounded-md border bg-surface px-2 py-1 text-center text-sm outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
          saving
            ? "border-amber-300 focus:border-amber-400"
            : "border-border focus:border-accent focus:ring-1 focus:ring-accent/30"
        }`}
      />
      {saving && (
        <Loader2 className="absolute -right-5 h-3.5 w-3.5 animate-spin text-muted" />
      )}
      {saved && !saving && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2">
          <div className="animate-saved-popup flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold whitespace-nowrap">Сохранено</span>
          </div>
        </div>
      )}
    </div>
  );
}

const formatDateTime = (iso: string) => formatWarsawDateTime(iso);

function teamCountWord(n: number) {
  if (n % 100 >= 11 && n % 100 <= 19) return "команд";
  const r = n % 10;
  if (r === 1) return "команда";
  if (r >= 2 && r <= 4) return "команды";
  return "команд";
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  const isOrganizer = role === "ADMIN" || role === "ORGANIZER";
  const { toast } = useToast();

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

  /* ─── Remove team from event ─── */
  const [removing, setRemoving] = useState<string | null>(null);

  /* ─── Delete submitted roster (organizer) ─── */
  const [removingRoster, setRemovingRoster] = useState<number | null>(null);

  /* ─── Auto-action from URL (?action=join|withdraw) ─── */
  const autoActionRan = useRef(false);

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
      setTeams((prev) => {
        const idx = prev.findIndex((t) => t.id === data.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...data, hasRoster: false };
          return next;
        }
        return [...prev, data];
      });
      clearSelected();
      toast("Команда добавлена");
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
      setTeams((prev) => {
        const idx = prev.findIndex((t) => t.id === data.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...data, hasRoster: false };
          return next;
        }
        return [...prev, data];
      });
      setJoinPhase("idle");
      setMyTeam(null);
      toast(data?.isReserve ? "Заявка добавлена в резерв" : "Вы присоединились к событию");
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

  async function handleRemove(teamId: string, skipConfirm = false) {
    if (!skipConfirm && !confirm("Отозвать заявку команды?")) return;
    setRemoving(teamId);
    try {
      const res = await fetch(`/api/events/${eventId}/teams/${teamId}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const now = new Date().toISOString();
        setTeams((prev) =>
          prev.map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  withdrawnAt: data?.entry?.withdrawnAt ?? now,
                  hasRoster: false,
                }
              : t,
          ),
        );
        toast("Заявка отозвана");
      }
    } finally {
      setRemoving(null);
    }
  }

  async function handleHardDelete(teamId: string) {
    if (!confirm("Полностью удалить запись о команде из события?")) return;
    setRemoving(teamId);
    try {
      const res = await fetch(`/api/events/${eventId}/teams/${teamId}?hard=1`, { method: "DELETE" });
      if (res.ok) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        toast("Запись удалена");
      }
    } finally {
      setRemoving(null);
    }
  }

  async function handleDeleteRoster(teamChgkId: number) {
    if (!confirm("Удалить поданный состав этой команды?")) return;
    setRemovingRoster(teamChgkId);
    try {
      const res = await fetch(
        `/api/roster/${eventId}?teamChgkId=${teamChgkId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setTeams((prev) =>
          prev.map((t) => (t.teamChgkId === teamChgkId ? { ...t, hasRoster: false } : t)),
        );
        toast("Состав удалён");
      }
    } finally {
      setRemovingRoster(null);
    }
  }

  /* ─── Auto-run action from URL once page data is ready ─── */
  useEffect(() => {
    if (autoActionRan.current) return;
    if (!action) return;
    if (pageLoading) return;
    if (sessionStatus === "loading") return;
    if (!userId) { autoActionRan.current = true; return; }

    const entry = teams.find((t) => t.addedBy === userId);
    const activeEntry = entry && !entry.withdrawnAt ? entry : undefined;

    if (action === "join") {
      // Skip auto-trigger if registration is blocked — user will see
      // the red "Регистрация недоступна" banner and can read why.
      const nowMs = Date.now();
      const opens = event?.registrationOpensAt ? new Date(event.registrationOpensAt).getTime() : null;
      const closes = event?.registrationClosesAt ? new Date(event.registrationClosesAt).getTime() : null;
      const activeCount = teams.filter((t) => !t.withdrawnAt && !t.isReserve).length;
      const blocked =
        (opens !== null && nowMs < opens) ||
        (closes !== null && nowMs > closes) ||
        (event?.participantLimit != null &&
          activeCount >= event.participantLimit &&
          !!event.closeOnLimit);
      if (!activeEntry && !blocked) {
        autoActionRan.current = true;
        handleJoinStart();
      } else {
        autoActionRan.current = true;
      }
    } else if (action === "withdraw") {
      if (activeEntry) {
        autoActionRan.current = true;
        handleRemove(activeEntry.id, true);
      } else {
        autoActionRan.current = true;
      }
    } else {
      autoActionRan.current = true;
    }

    // Clean the action param from the URL so a refresh doesn't re-trigger.
    router.replace(`/calendar/${eventId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, pageLoading, sessionStatus, userId, teams]);

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
  const myActiveEntry = myEntry && !myEntry.withdrawnAt ? myEntry : undefined;
  const alreadyJoined = !!myActiveEntry;

  const activeTeams = teams.filter((t) => !t.withdrawnAt && !t.isReserve);
  const reserveTeams = teams.filter((t) => !t.withdrawnAt && t.isReserve);
  const withdrawnTeams = teams
    .filter((t) => t.withdrawnAt)
    .sort((a, b) => (a.withdrawnAt! < b.withdrawnAt! ? 1 : -1));
  const sortedTeams = [...activeTeams, ...reserveTeams, ...withdrawnTeams];
  const activeTeamsCount = activeTeams.length;

  // Registration window + limit status (computed on client, timezone-safe)
  const now = Date.now();
  const opensAt = event.registrationOpensAt ? new Date(event.registrationOpensAt).getTime() : null;
  const closesAt = event.registrationClosesAt ? new Date(event.registrationClosesAt).getTime() : null;
  const notYetOpen = opensAt !== null && now < opensAt;
  const closedByTime = closesAt !== null && now > closesAt;
  const limitReached =
    event.participantLimit != null && activeTeamsCount >= event.participantLimit;
  const hardClosedByLimit = limitReached && !!event.closeOnLimit;
  const willGoToReserve = limitReached && !event.closeOnLimit;
  const registrationBlocked = notYetOpen || closedByTime || hardClosedByLimit;
  const blockedReason: string | null = notYetOpen
    ? `Приём заявок откроется ${formatDateTime(event.registrationOpensAt!)}`
    : closedByTime
      ? `Приём заявок закрыт ${formatDateTime(event.registrationClosesAt!)}`
      : hardClosedByLimit
        ? `Достигнут лимит команд (${event.participantLimit}) — приём закрыт`
        : null;

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
      <div className="mb-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
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

        {(event.registrationOpensAt || event.registrationClosesAt || event.participantLimit != null) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-muted">
            {event.registrationOpensAt && (
              <span>
                Приём заявок с <span className="font-medium text-foreground">{formatDateTime(event.registrationOpensAt)}</span>
              </span>
            )}
            {event.registrationClosesAt && (
              <span>
                до <span className="font-medium text-foreground">{formatDateTime(event.registrationClosesAt)}</span>
              </span>
            )}
            {event.participantLimit != null && (
              <span>
                Лимит команд: <span className="font-medium text-foreground">{event.participantLimit}</span>
                {event.closeOnLimit
                  ? <span className="ml-1 text-red-600">(приём закроется при достижении лимита)</span>
                  : <span className="ml-1 text-amber-700">(заявки свыше — в резерв)</span>}
              </span>
            )}
          </div>
        )}

        {(event.registrationLink || event.mediaLink || event.ratingUrl) && (
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
            {event.ratingUrl && (
              <a
                href={event.ratingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                Сайт рейтинга <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Teams section */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <h2 className="font-bold">Команды</h2>
            {activeTeamsCount > 0 && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                {activeTeamsCount}
                {event.participantLimit != null && `/${event.participantLimit}`}
              </span>
            )}
            {reserveTeams.length > 0 && (
              <span
                title={`${reserveTeams.length} в резерве`}
                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
              >
                Резерв: {reserveTeams.length}
              </span>
            )}
            {withdrawnTeams.length > 0 && (
              <span
                title={`${withdrawnTeams.length} отзаявившихся`}
                className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600"
              >
                −{withdrawnTeams.length}
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
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
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
                      className="mb-2 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
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
                  Отозвать заявку
                </button>
              </div>
            ) : myEntry?.withdrawnAt ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <X className="h-4 w-4 shrink-0" />
                <span>
                  Заявка отозвана{" "}
                  <strong>{formatDateTime(myEntry.withdrawnAt)}</strong>
                </span>
                <button
                  onClick={handleJoinStart}
                  disabled={registrationBlocked}
                  title={blockedReason ?? undefined}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Заявиться снова
                </button>
              </div>
            ) : joinPhase === "idle" ? (
              <div>
                {registrationBlocked ? (
                  <div className="inline-flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <span className="font-medium">Регистрация недоступна</span>
                    <span className="text-xs">{blockedReason}</span>
                  </div>
                ) : (
                  <>
                    {willGoToReserve && (
                      <div className="mb-2 inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span>
                          Лимит в <strong>{event.participantLimit}</strong> команд уже достигнут.
                          Ваша заявка попадёт в резерв и автоматически перейдёт в основной состав,
                          если одна из команд отзаявится.
                        </span>
                      </div>
                    )}
                    <div>
                      <button
                        onClick={handleJoinStart}
                        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        <UserPlus className="h-4 w-4" />
                        {willGoToReserve ? "Заявиться в резерв" : "Заявиться"}
                      </button>
                    </div>
                  </>
                )}
                {joinError && <p className="mt-2 text-xs text-red-600">{joinError}</p>}
              </div>
            ) : joinPhase === "loading" ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загружаем информацию о вашей команде...
              </div>
            ) : joinPhase === "preview" || joinPhase === "submitting" ? (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                {willGoToReserve && (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Заявка попадёт в <strong>резерв</strong> — лимит в {event.participantLimit} команд уже достигнут.
                  </div>
                )}
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
                    className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
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
                    {willGoToReserve ? "Подтвердить (резерв)" : "Подтвердить"}
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
              Войдите, чтобы заявиться
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
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Заявка</th>
                  <th className="px-5 py-2.5 font-medium w-20 text-right">ID</th>
                  {isOrganizer && (
                    <>
                      <th className="px-3 py-2.5 font-medium text-center w-14">Состав</th>
                      <th className="px-3 py-2.5 font-medium text-center w-20">Сколько</th>
                    </>
                  )}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedTeams.map((team, idx) => {
                  const displayName = team.displayName ?? team.teamName;
                  const hasCustom = !!team.displayName && team.displayName !== team.teamName;
                  const canRemove = isOrganizer || team.addedBy === userId;
                  const isWithdrawn = !!team.withdrawnAt;
                  const isReserve = !isWithdrawn && team.isReserve;
                  const rowClass = isWithdrawn
                    ? "bg-red-50/60 text-red-900/80"
                    : isReserve
                      ? "bg-amber-50/40"
                      : "hover:bg-surface/40";

                  // Section header rows
                  const prev = sortedTeams[idx - 1];
                  const showReserveHeader =
                    isReserve && (!prev || !prev.isReserve || !!prev.withdrawnAt);
                  const showWithdrawnHeader =
                    isWithdrawn && (!prev || !prev.withdrawnAt);

                  const reserveIndex = isReserve
                    ? reserveTeams.findIndex((t) => t.id === team.id) + 1
                    : 0;

                  return (
                    <Fragment key={team.id}>
                      {showReserveHeader && (
                        <tr className="bg-amber-50/70">
                          <td colSpan={isOrganizer ? 7 : 5} className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                            Резерв {event.participantLimit != null && `(лимит ${event.participantLimit})`}
                          </td>
                        </tr>
                      )}
                      {showWithdrawnHeader && (
                        <tr className="bg-red-50/70">
                          <td colSpan={isOrganizer ? 7 : 5} className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-700">
                            Отзаявившиеся
                          </td>
                        </tr>
                      )}
                    <tr className={rowClass}>
                      <td className="px-5 py-3 font-mono text-xs text-muted">
                        {isWithdrawn ? "—" : isReserve ? `Р${reserveIndex}` : idx + 1}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isWithdrawn ? "line-through decoration-red-400/70" : ""}`}>
                            {displayName}
                          </span>
                          {hasCustom && (
                            <span className="text-xs text-muted">({team.teamName})</span>
                          )}
                          {isReserve && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Резерв
                            </span>
                          )}
                          {isWithdrawn && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                              Отзаявлена
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs">
                        {isWithdrawn ? (
                          <div className="flex flex-col leading-tight">
                            <span className="text-muted/70 line-through">
                              {formatDateTime(team.addedAt)}
                            </span>
                            <span className="font-semibold text-red-600">
                              Отзыв: {formatDateTime(team.withdrawnAt!)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted">{formatDateTime(team.addedAt)}</span>
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
                      {isOrganizer && (
                        <>
                          {/* Состав submitted? */}
                          <td className="px-3 py-3 text-center">
                            {isWithdrawn ? (
                              <span title="Команда отзаявилась" className="text-red-400/70">—</span>
                            ) : team.hasRoster ? (
                              <div className="inline-flex items-center gap-1">
                                <span title="Состав подан">✅</span>
                                <button
                                  onClick={() => handleDeleteRoster(team.teamChgkId)}
                                  disabled={removingRoster === team.teamChgkId}
                                  title="Удалить состав"
                                  className="rounded p-0.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-40"
                                >
                                  {removingRoster === team.teamChgkId ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span title="Состав не подан" className="text-muted/40">—</span>
                            )}
                          </td>
                          {/* Editable players count */}
                          <td className="px-3 py-2">
                            {isWithdrawn ? (
                              <span className="text-xs text-red-400/70">—</span>
                            ) : (
                              <PlayersCountInput
                                eventId={eventId}
                                teamId={team.id}
                                value={team.playersCount}
                                onChange={(v) =>
                                  setTeams((prev) =>
                                    prev.map((t) =>
                                      t.id === team.id ? { ...t, playersCount: v } : t,
                                    ),
                                  )
                                }
                              />
                            )}
                          </td>
                        </>
                      )}
                      <td className="pr-3">
                        {canRemove && !isWithdrawn && (
                          <button
                            onClick={() => handleRemove(team.id)}
                            disabled={removing === team.id}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
                            title="Отозвать заявку"
                          >
                            {removing === team.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {isOrganizer && isWithdrawn && (
                          <button
                            onClick={() => handleHardDelete(team.id)}
                            disabled={removing === team.id}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
                            title="Удалить запись навсегда"
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
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {teams.length > 0 && (
          <div className="border-t border-border px-5 py-3 text-xs text-muted">
            {activeTeamsCount} {teamCountWord(activeTeamsCount)}
            {event.participantLimit != null && (
              <span className="ml-1 text-muted/70">/ {event.participantLimit}</span>
            )}
            {reserveTeams.length > 0 && (
              <span className="ml-2 text-amber-700">
                (резерв: {reserveTeams.length})
              </span>
            )}
            {withdrawnTeams.length > 0 && (
              <span className="ml-2 text-red-600">
                (отзаявилось: {withdrawnTeams.length})
              </span>
            )}
            {isOrganizer && activeTeams.some((t) => t.playersCount != null) && (
              <span className="ml-3">
                · {activeTeams.reduce((s, t) => s + (t.playersCount ?? 0), 0)} игроков суммарно
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
