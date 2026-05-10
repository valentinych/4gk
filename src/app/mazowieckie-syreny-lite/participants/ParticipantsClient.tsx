"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Pencil,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";

interface TeamRow {
  id: string;
  teamChgkId: number | null;
  teamName: string;
  city: string;
  manualEntry: boolean;
  addedAt: string;
  ratingPosition: number | null;
  ratingScore: number | null;
  /** Admin-only fields. Returned by the API only when the requester is an organizer/admin. */
  contactName?: string | null;
  contactEmail?: string | null;
  contactTelegram?: string | null;
}

interface ChgkTeamResult {
  id: number;
  name: string;
  town?: { name: string };
}

const TOKEN_KEY = "mazowieckie-syreny-lite:tokens";

function loadTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveToken(id: string, token: string) {
  const all = loadTokens();
  all[id] = token;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
}

function dropToken(id: string) {
  const all = loadTokens();
  delete all[id];
  localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

function fmtFullDateTime(iso: string): string {
  const d = new Date(iso);
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const dd = d.getDate();
  const mm = months[d.getMonth()];
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${mm} ${yy} в ${hh}:${mi}`;
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "0 секунд";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} д`);
  if (hours > 0 || days > 0) parts.push(`${hours} ч`);
  parts.push(`${mins} мин`);
  if (days === 0 && hours === 0) parts.push(`${secs} с`);
  return parts.join(" ");
}

function buildWithdrawUrl(id: string, token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/mazowieckie-syreny-lite/withdraw?id=${encodeURIComponent(
    id,
  )}&token=${encodeURIComponent(token)}`;
}

/**
 * Teams ranked below 600th place (or with no rating yet) that registered before
 * the cutoff are guaranteed a slot. Cutoff = end of day 10 May 2026 Warsaw
 * (CEST = UTC+2), i.e. 11 May 00:00 local == 10 May 22:00 UTC.
 */
const GUARANTEED_RATING_THRESHOLD = 600;
const GUARANTEED_REG_CUTOFF_MS = Date.UTC(2026, 4, 10, 22, 0, 0);

function isGuaranteed(t: TeamRow): boolean {
  const lowRated = t.ratingPosition === null || t.ratingPosition > GUARANTEED_RATING_THRESHOLD;
  const earlyReg = new Date(t.addedAt).getTime() < GUARANTEED_REG_CUTOFF_MS;
  return lowRated && earlyReg;
}

export function ParticipantsClient() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [ratingReleaseDate, setRatingReleaseDate] = useState<string | null>(null);
  const [registrationOpensAt, setRegistrationOpensAt] = useState<string | null>(null);
  const [registrationClosesAt, setRegistrationClosesAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState<{
    id: string;
    token: string;
  } | null>(null);

  useEffect(() => setTokens(loadTokens()), []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/syreny-lite/teams", { cache: "no-store" });
      const data = await res.json();
      setTeams(data.teams ?? []);
      setRatingReleaseDate(data.ratingReleaseDate ?? null);
      setRegistrationOpensAt(data.registrationOpensAt ?? null);
      setRegistrationClosesAt(data.registrationClosesAt ?? null);
      setIsAdmin(!!data.isAdmin);
    } finally {
      setLoading(false);
    }
  }, []);

  const opensAtMs = registrationOpensAt ? new Date(registrationOpensAt).getTime() : null;
  const closesAtMs = registrationClosesAt ? new Date(registrationClosesAt).getTime() : null;
  const notYetOpen = opensAtMs !== null && now < opensAtMs;
  const closedByTime = closesAtMs !== null && now > closesAtMs;
  const registrationBlocked = notYetOpen || closedByTime;

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myTeam = useMemo(
    () => teams.find((t) => tokens[t.id]),
    [teams, tokens],
  );

  async function handleWithdraw(id: string) {
    const token = tokens[id];
    if (!token) return;
    if (!confirm("Отозвать заявку команды?")) return;
    const res = await fetch(
      `/api/syreny-lite/teams/${id}?token=${encodeURIComponent(token)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      dropToken(id);
      setTokens(loadTokens());
      refresh();
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/mazowieckie-syreny-lite"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Syrenki Mazowieckie Lite
      </Link>

      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-lime-100 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
          <Sparkles className="h-3.5 w-3.5" />
          Syrenki Mazowieckie Lite — 2026
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Список команд</h1>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Следующий термин подтверждения участия — <strong>24 мая</strong>.
        </p>
      </div>

      {/* Edit form */}
      {editingId && (
        <div className="mb-6">
          <EditForm
            id={editingId}
            token={tokens[editingId] ?? null}
            isAdmin={isAdmin}
            onSuccess={() => {
              setEditingId(null);
              refresh();
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {/* Action area */}
      <div className="mb-6">
        {justRegistered && (
          <SuccessBanner
            url={buildWithdrawUrl(justRegistered.id, justRegistered.token)}
            onClose={() => setJustRegistered(null)}
          />
        )}
        {myTeam ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Ваша заявка принята: <strong>{myTeam.teamName}</strong>
              {myTeam.city && <span className="text-emerald-700/70"> · {myTeam.city}</span>}
            </span>
            <button
              onClick={() => setEditingId(myTeam.id)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Pencil className="h-3.5 w-3.5" />
              Изменить
            </button>
            <button
              onClick={() => handleWithdraw(myTeam.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
              Отозвать заявку
            </button>
          </div>
        ) : registrationBlocked ? (
          <RegistrationClosedBanner
            notYetOpen={notYetOpen}
            opensAtMs={opensAtMs}
            closesAtMs={closesAtMs}
            now={now}
            registrationOpensAt={registrationOpensAt}
            registrationClosesAt={registrationClosesAt}
          />
        ) : showForm ? (
          <RegisterForm
            onSuccess={(id, token) => {
              saveToken(id, token);
              setTokens(loadTokens());
              setShowForm(false);
              setJustRegistered({ id, token });
              refresh();
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" />
            Заявиться
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>
          <Users className="mr-1 inline h-4 w-4" />
          {teams.length} команд
        </span>
        {ratingReleaseDate && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium shadow-sm">
            Рейтинг по состоянию релиза{" "}
            <span className="font-semibold text-foreground">{ratingReleaseDate}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Гарантировано — команды ниже 600 места, заявившиеся до 10 мая
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-sm text-muted">
          Пока нет заявленных команд
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-3 py-2.5 text-center w-8">#</th>
                <th className="px-3 py-2.5 text-left">Команда</th>
                <th className="px-3 py-2.5 text-left hidden sm:table-cell">Город</th>
                <th className="px-3 py-2.5 text-right hidden sm:table-cell">Место</th>
                <th className="px-3 py-2.5 text-left hidden lg:table-cell">Заявка</th>
                {isAdmin && (
                  <th className="px-3 py-2.5 text-left">Контакты (только админам)</th>
                )}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {teams.map((t, idx) => {
                const isMine = !!tokens[t.id];
                const isReserve = idx >= 16;
                const guaranteed = isGuaranteed(t);
                const rowCls = isMine
                  ? "bg-emerald-50/60"
                  : isReserve
                    ? "bg-red-50"
                    : "";
                const guaranteedBadge = guaranteed && (
                  <span
                    title="Гарантированное участие: ниже 600 места и заявка до 10 мая"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Гарантировано
                  </span>
                );
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border/50 last:border-0 transition-colors hover:brightness-[0.97] ${rowCls}`}
                  >
                    <td className="px-3 py-2 text-center text-xs font-bold text-muted">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {t.teamChgkId ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <a
                            href={`https://rating.chgk.info/teams/${t.teamChgkId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-accent transition-colors"
                          >
                            {t.teamName}
                            <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                          </a>
                          {guaranteedBadge}
                        </span>
                      ) : (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {t.teamName}
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            Впервые
                          </span>
                          {guaranteedBadge}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted hidden sm:table-cell">
                      {t.city || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm hidden sm:table-cell">
                      {t.ratingPosition ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted tabular-nums hidden lg:table-cell whitespace-nowrap">
                      {fmtTimestamp(t.addedAt)}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2 text-xs">
                        <AdminContacts
                          name={t.contactName ?? null}
                          email={t.contactEmail ?? null}
                          telegram={t.contactTelegram ?? null}
                        />
                      </td>
                    )}
                    <td className="pr-3 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        {(isMine || isAdmin) && (
                          <button
                            onClick={() => setEditingId(t.id)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                            title="Изменить заявку"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isMine && (
                          <button
                            onClick={() => handleWithdraw(t.id)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Отозвать заявку"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Сортировка: команды без записи на сайте рейтинга — сверху, далее по месту
        в рейтинге от слабых к сильным. Рейтинг — rating.chgk.gg.
      </p>
    </div>
  );
}

/* ─── Admin contacts cell ─── */

function AdminContacts({
  name,
  email,
  telegram,
}: {
  name: string | null;
  email: string | null;
  telegram: string | null;
}) {
  const tgHandle = telegram?.replace(/^@/, "");
  return (
    <div className="space-y-0.5">
      {name && <div className="font-medium text-foreground">{name}</div>}
      {email && (
        <div>
          <a
            href={`mailto:${email}`}
            className="text-muted hover:text-accent transition-colors"
          >
            {email}
          </a>
        </div>
      )}
      {telegram && (
        <div>
          {tgHandle ? (
            <a
              href={`https://t.me/${tgHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent transition-colors"
            >
              @{tgHandle}
            </a>
          ) : (
            <span className="text-muted">{telegram}</span>
          )}
        </div>
      )}
      {!name && !email && !telegram && <span className="text-muted">—</span>}
    </div>
  );
}

/* ─── Edit form ─── */

interface EditableEntry {
  id: string;
  teamName: string;
  teamChgkId: number | null;
  city: string;
  manualEntry: boolean;
  contactName: string;
  contactEmail: string;
  contactTelegram: string;
}

function EditForm({
  id,
  token,
  isAdmin,
  onSuccess,
  onCancel,
}: {
  id: string;
  token: string | null;
  isAdmin: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [entry, setEntry] = useState<EditableEntry | null>(null);
  const [teamName, setTeamName] = useState("");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = token ? `?token=${encodeURIComponent(token)}` : "";
        const res = await fetch(`/api/syreny-lite/teams/${id}${qs}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setError(data.error ?? "Не удалось загрузить заявку");
          return;
        }
        const data: EditableEntry = await res.json();
        if (cancelled) return;
        setEntry(data);
        setTeamName(data.teamName);
        setCity(data.city);
        setContactName(data.contactName);
        setContactEmail(data.contactEmail);
        setContactTelegram(data.contactTelegram);
      } catch {
        if (!cancelled) setError("Ошибка сети");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    setError(null);

    if (!contactName.trim()) {
      setError("Укажите имя капитана");
      return;
    }
    if (!contactEmail.trim() && !contactTelegram.trim()) {
      setError("Укажите email или Telegram для связи");
      return;
    }
    if (entry.manualEntry && !teamName.trim()) {
      setError("Укажите название команды");
      return;
    }

    const payload: Record<string, unknown> = {
      city: city.trim(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactTelegram: contactTelegram.trim(),
    };
    if (entry.manualEntry) payload.teamName = teamName.trim();

    setSubmitting(true);
    try {
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/syreny-lite/teams/${id}${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      onSuccess();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-surface p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        {error ?? "Заявка не найдена"}
        <button
          onClick={onCancel}
          className="ml-3 inline-flex items-center gap-1 text-xs underline"
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">
          Изменить заявку
          {isAdmin && !token && (
            <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              admin
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Команда
        </label>
        {entry.manualEntry ? (
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        ) : (
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
            {entry.teamName}
            {entry.teamChgkId && (
              <span className="ml-1.5 text-xs">#{entry.teamChgkId}</span>
            )}
            <p className="mt-1 text-xs text-muted/80">
              Чтобы сменить команду, отзовите заявку и подайте новую.
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Город
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Варшава"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Имя капитана *
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
            Email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Telegram
          </label>
          <input
            type="text"
            value={contactTelegram}
            onChange={(e) => setContactTelegram(e.target.value)}
            placeholder="@username"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <p className="mt-1 text-xs text-muted">
            Email или Telegram — хотя бы одно поле обязательно.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Сохранить
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface disabled:opacity-50"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

/* ─── Register form ─── */

function RegisterForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (id: string, token: string) => void;
  onCancel: () => void;
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
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");

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
        const res = await fetch(
          `/api/chgk/search?type=team&q=${encodeURIComponent(query)}`,
        );
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
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!contactName.trim()) {
      setError("Укажите имя капитана");
      return;
    }
    if (!contactEmail.trim() && !contactTelegram.trim()) {
      setError("Укажите email или Telegram для связи");
      return;
    }

    let payload: Record<string, unknown>;
    if (manualEntry) {
      if (!manualName.trim()) {
        setError("Укажите название команды");
        return;
      }
      payload = {
        manualEntry: true,
        teamName: manualName.trim(),
        city: city.trim(),
      };
    } else {
      if (!selectedTeam) {
        setError("Выберите команду из списка ЧГК");
        return;
      }
      payload = {
        manualEntry: false,
        teamChgkId: selectedTeam.id,
        teamName: selectedTeam.name,
        city: city.trim() || selectedTeam.town?.name || "",
      };
    }

    payload.contactName = contactName.trim();
    payload.contactEmail = contactEmail.trim();
    payload.contactTelegram = contactTelegram.trim();

    setSubmitting(true);
    try {
      const res = await fetch("/api/syreny-lite/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      onSuccess(data.id, data.withdrawToken);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-accent/20 bg-accent/5 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Заявка на турнир</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
        <input
          type="checkbox"
          checked={manualEntry}
          onChange={(e) => {
            setManualEntry(e.target.checked);
            setSelectedTeam(null);
            setResults([]);
            setQuery("");
          }}
          className="rounded"
        />
        Команда играет в ЧГК впервые / нет записи на rating.chgk.info
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
          {selectedTeam && (
            <p className="mt-1.5 text-xs text-muted">
              Выбрано:{" "}
              <a
                href={`https://rating.chgk.info/teams/${selectedTeam.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {selectedTeam.name} #{selectedTeam.id}
              </a>
            </p>
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
            placeholder="Название команды"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
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
          placeholder="Варшава"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Имя капитана *
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Иван Иванов"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="captain@example.com"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Telegram
          </label>
          <input
            type="text"
            value={contactTelegram}
            onChange={(e) => setContactTelegram(e.target.value)}
            placeholder="@username"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <p className="mt-1 text-xs text-muted">
            Email или Telegram — хотя бы одно поле обязательно.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Подтвердить заявку
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface disabled:opacity-50"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

/* ─── Registration closed / not-yet-open banner ─── */

function RegistrationClosedBanner({
  notYetOpen,
  opensAtMs,
  closesAtMs,
  now,
  registrationOpensAt,
  registrationClosesAt,
}: {
  notYetOpen: boolean;
  opensAtMs: number | null;
  closesAtMs: number | null;
  now: number;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
}) {
  if (notYetOpen && opensAtMs !== null && registrationOpensAt) {
    const remaining = opensAtMs - now;
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <CalendarClock className="h-4 w-4" />
          Приём заявок ещё не открыт
        </div>
        <p className="text-amber-800/90">
          Открытие: <strong>{fmtFullDateTime(registrationOpensAt)}</strong> по
          варшавскому времени.
        </p>
        <p className="mt-2 font-mono text-base font-bold tabular-nums">
          до открытия: {fmtCountdown(remaining)}
        </p>
      </div>
    );
  }

  if (closesAtMs !== null && now > closesAtMs && registrationClosesAt) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Lock className="h-4 w-4" />
          Приём заявок закрыт
        </div>
        <p className="text-red-800/90">
          Регистрация была закрыта <strong>{fmtFullDateTime(registrationClosesAt)}</strong>.
        </p>
      </div>
    );
  }

  return null;
}

/* ─── Success banner with permanent withdraw URL ─── */

function SuccessBanner({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          Заявка принята
        </div>
        <button
          onClick={onClose}
          className="text-emerald-700/70 hover:text-emerald-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-3 text-emerald-800/90">
        Сохраните эту ссылку — по ней можно отозвать заявку с любого устройства.
        Ссылка также сохранена в этом браузере, но рекомендуем переслать её себе
        в мессенджер или email.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-mono text-emerald-900">
          {url}
        </code>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Скопировано" : "Скопировать"}
        </button>
      </div>
    </div>
  );
}
