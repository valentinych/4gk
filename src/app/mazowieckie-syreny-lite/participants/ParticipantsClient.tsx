"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
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

export function ParticipantsClient() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [ratingReleaseDate, setRatingReleaseDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => setTokens(loadTokens()), []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/syreny-lite/teams", { cache: "no-store" });
      const data = await res.json();
      setTeams(data.teams ?? []);
      setRatingReleaseDate(data.ratingReleaseDate ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

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
        Mazowieckie Syreny Lite
      </Link>

      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-lime-100 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
          <Sparkles className="h-3.5 w-3.5" />
          Mazowieckie Syreny Lite — 2026
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Список команд</h1>
      </div>

      {/* Action area */}
      <div className="mb-6">
        {myTeam ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Ваша заявка принята: <strong>{myTeam.teamName}</strong>
              {myTeam.city && <span className="text-emerald-700/70"> · {myTeam.city}</span>}
            </span>
            <button
              onClick={() => handleWithdraw(myTeam.id)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
              Отозвать заявку
            </button>
          </div>
        ) : showForm ? (
          <RegisterForm
            onSuccess={(id, token) => {
              saveToken(id, token);
              setTokens(loadTokens());
              setShowForm(false);
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
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {teams.map((t, idx) => {
                const isMine = !!tokens[t.id];
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border/50 last:border-0 transition-colors hover:brightness-[0.97] ${
                      isMine ? "bg-emerald-50/60" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-xs font-bold text-muted">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {t.teamChgkId ? (
                        <a
                          href={`https://rating.chgk.info/teams/${t.teamChgkId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-accent transition-colors"
                        >
                          {t.teamName}
                          <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          {t.teamName}
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            Впервые
                          </span>
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
                    <td className="pr-3 text-right">
                      {isMine && (
                        <button
                          onClick={() => handleWithdraw(t.id)}
                          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Отозвать заявку"
                        >
                          <X className="h-3.5 w-3.5" />
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

      <p className="mt-4 text-xs text-muted">
        Сортировка: команды без записи на сайте рейтинга — сверху, далее по месту
        в рейтинге от слабых к сильным. Рейтинг — rating.chgk.gg.
      </p>
    </div>
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
