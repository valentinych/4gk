"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";
import { formatWarsawDateTime, isoToWarsawInputValue } from "@/lib/time";

type ContactKind = "EMAIL" | "TELEGRAM" | "OTHER";
type Preview = "off" | "linked" | "noid" | "guest";
type PreviewPhase = "before" | "after";
type TeamSource = "own" | "rating" | "free";

const PREVIEW_TEAM_ID = "preview-example";
const PREVIEW_TEAM_NAME = "Пример команды";

type PublicTeam = {
  id: string;
  teamChgkId: number | null;
  name: string;
  city: string;
  createdAt: string;
};
type ContactRow = { id: string; contactKind: ContactKind; contactValue: string };
type TestTeam = PublicTeam & ContactRow;

type OchpState = {
  opensAt: string | null;
  open: boolean;
  isAdmin: boolean;
  viewer: { loggedIn: boolean; email: string | null; ownTeamName: string | null };
  teams: PublicTeam[];
  contacts?: ContactRow[];
  testTeams?: TestTeam[];
};

type RatingTeam = { id: number; name: string; town?: { name: string } };

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

function contactLabel(kind: ContactKind): string {
  if (kind === "EMAIL") return "Email";
  if (kind === "TELEGRAM") return "Telegram";
  return "Другой способ";
}

function TeamsTable({
  teams,
  contacts,
}: {
  teams: PublicTeam[];
  contacts?: Map<string, ContactRow>;
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <th scope="col" className="px-4 py-2 font-semibold">
              Команда
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              ID
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              Город
            </th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">
              Время
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {teams.map((team) => {
            const contact = contacts?.get(team.id);
            return (
              <tr key={team.id}>
                <td className="px-4 py-3">
                  <span className="font-medium">{team.name}</span>
                  {contact && (
                    <p className="mt-1 text-xs text-muted">
                      {contactLabel(contact.contactKind)}: {contact.contactValue}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted">{team.teamChgkId ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{team.city?.trim() || "—"}</td>
                <td className="px-4 py-3 text-right">
                  {team.createdAt ? (
                    <time dateTime={team.createdAt} className="text-xs text-muted tabular-nums">
                      {formatWarsawDateTime(team.createdAt)}
                    </time>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Ochp2027Client() {
  const baseId = useId();
  const [state, setState] = useState<OchpState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>("off");
  const [previewPhase, setPreviewPhase] = useState<PreviewPhase>("before");
  const [opensInput, setOpensInput] = useState("");
  const [savingOpens, setSavingOpens] = useState(false);

  const [source, setSource] = useState<TeamSource | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RatingTeam[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<RatingTeam | null>(null);
  const [freeName, setFreeName] = useState("");
  const [oneTime, setOneTime] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [contactKind, setContactKind] = useState<ContactKind | null>(null);
  const [contactValue, setContactValue] = useState("");
  const [useAccountEmail, setUseAccountEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const teamRef = useRef<HTMLInputElement>(null);
  const freeRef = useRef<HTMLInputElement>(null);
  const oneTimeRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const res = await fetch("/api/ochp/2027", { cache: "no-store" });
    const data = (await res.json()) as OchpState & { error?: string };
    if (!res.ok) throw new Error(data.error || "Не удалось загрузить заявки");
    setState(data);
    setOpensInput(isoToWarsawInputValue(data.opensAt));
    setLoadError(null);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ochp/2027", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as OchpState & { error?: string };
        if (!res.ok) throw new Error(data.error || "Не удалось загрузить заявки");
        if (!cancelled) {
          setState(data);
          setOpensInput(isoToWarsawInputValue(data.opensAt));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Не удалось загрузить заявки");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const field =
      invalidField === "team"
        ? teamRef.current
        : invalidField === "free"
          ? freeRef.current
          : invalidField === "oneTime"
            ? oneTimeRef.current
            : invalidField === "contact"
              ? contactRef.current
              : null;
    (field ?? errorRef.current)?.focus();
  }, [error, invalidField]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const notInRating = source === "free";
  useEffect(() => {
    if (notInRating || !query.trim() || selectedTeam) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/chgk/search?type=team&q=${encodeURIComponent(query)}`);
        const data = (await res.json()) as RatingTeam[];
        const rows = Array.isArray(data) ? data : [];
        setResults(rows);
        setShowDropdown(rows.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query, selectedTeam, notInRating]);

  const isAdmin = state?.isAdmin === true;
  const officiallyOpen = state?.open === true;
  const showOwn =
    state != null &&
    (preview === "linked" || (preview === "off" && Boolean(state.viewer.ownTeamName)));
  const showAccountEmail =
    preview !== "guest" && Boolean(state?.viewer.loggedIn && state.viewer.email);
  const inPersonaPreview = isAdmin && preview !== "off";
  const testSubmit = inPersonaPreview || (isAdmin && !officiallyOpen);
  const registrationOpen = inPersonaPreview || officiallyOpen;
  const showAppliedPreview = inPersonaPreview && previewPhase === "after";
  const showApplicationForm = (officiallyOpen || isAdmin) && !showAppliedPreview;

  function fail(message: string, field: string | null) {
    setNotice(null);
    setError(message);
    setInvalidField(field);
    if (field === "team") teamRef.current?.focus();
    else if (field === "free") freeRef.current?.focus();
    else if (field === "oneTime") oneTimeRef.current?.focus();
    else if (field === "contact") contactRef.current?.focus();
  }

  function clearTeamChoice() {
    setSource(null);
    setSelectedTeam(null);
    setQuery("");
    setFreeName("");
  }

  async function onSaveOpens(e: React.FormEvent) {
    e.preventDefault();
    setSavingOpens(true);
    setError(null);
    try {
      const res = await fetch("/api/ochp/2027", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opensAt: opensInput || null }),
      });
      const data = (await res.json()) as OchpState & { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить время");
      setState(data);
      setOpensInput(isoToWarsawInputValue(data.opensAt));
      setNotice(data.opensAt ? "Время открытия сохранено" : "Приём заявок закрыт: время не задано");
    } catch (err) {
      setNotice(null);
      setError(err instanceof Error ? err.message : "Не удалось сохранить время");
    } finally {
      setSavingOpens(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setInvalidField(null);

    if (source === "rating" && !selectedTeam) {
      fail("Выберите команду из рейтинга", "team");
      return;
    }
    if (source === "free" && !freeName.trim()) {
      fail("Укажите название команды", "free");
      return;
    }
    if (source !== "own" && source !== "rating" && source !== "free") {
      fail("Выберите команду", "team");
      return;
    }

    if (oneTime && !displayName.trim()) {
      fail("Укажите разовое название", "oneTime");
      return;
    }
    if (!contactKind) {
      fail("Укажите один способ связи", "contact");
      return;
    }
    if (contactKind === "EMAIL" && !(showAccountEmail && useAccountEmail) && !contactValue.trim()) {
      fail("Укажите email", "contact");
      return;
    }
    if (contactKind !== "EMAIL" && contactValue.trim().length < 2) {
      fail(contactKind === "TELEGRAM" ? "Укажите Telegram" : "Укажите другой способ контакта", "contact");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/ochp/2027", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          teamChgkId: source === "rating" ? selectedTeam?.id : undefined,
          teamName: source === "free" ? freeName.trim() : undefined,
          oneTime,
          displayName: oneTime ? displayName.trim() : undefined,
          contactKind: contactKind === "EMAIL" ? "email" : contactKind === "TELEGRAM" ? "telegram" : "other",
          contactValue: contactKind === "EMAIL" && useAccountEmail ? undefined : contactValue.trim(),
          useAccountEmail: contactKind === "EMAIL" && showAccountEmail && useAccountEmail,
          test: testSubmit,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить заявку");
      clearTeamChoice();
      setOneTime(false);
      setDisplayName("");
      setContactValue("");
      setUseAccountEmail(false);
      setNotice(testSubmit ? "Тестовая заявка сохранена" : "Заявка принята");
      try {
        await reload();
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Не удалось обновить список");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить заявку");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeTest(id: string | null) {
    if (id == null && !window.confirm("Удалить все тестовые заявки?")) return;
    setError(null);
    try {
      const q = id ? `id=${encodeURIComponent(id)}` : "all=1";
      const res = await fetch(`/api/ochp/2027?${q}`, { method: "DELETE" });
      const data = (await res.json()) as OchpState & { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");
      setState(data);
      setNotice(id ? "Тестовая заявка удалена" : "Тестовые заявки удалены");
    } catch (err) {
      setNotice(null);
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }

  const contacts = new Map((state?.contacts ?? []).map((c) => [c.id, c]));
  const publicTeams: PublicTeam[] =
    state == null
      ? []
      : showAppliedPreview
        ? [
            ...state.teams,
            { id: PREVIEW_TEAM_ID, teamChgkId: null, name: PREVIEW_TEAM_NAME, city: "—", createdAt: "" },
          ]
        : state.teams;
  const testPreview: PublicTeam[] =
    isAdmin && state
      ? (state.testTeams ?? []).map((team) => ({
          id: team.id,
          teamChgkId: team.teamChgkId,
          name: team.name,
          city: team.city || "—",
          createdAt: team.createdAt,
        }))
      : [];
  const closedText =
    state == null
      ? null
      : registrationOpen
        ? "Приём заявок открыт."
        : state.opensAt
          ? `Приём заявок откроется ${formatWarsawDateTime(state.opensAt)} (по варшавскому времени).`
          : "Приём заявок ещё не открыт.";

  return (
    <div id="page-ochp-registration" className="space-y-8">
      <p role="status" className="sr-only">
        {notice ?? ""}
      </p>

      {loadError && (
        <p role="alert" className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          {loadError}
        </p>
      )}

      {!state && !loadError && <p className="text-sm text-muted">Загрузка…</p>}

      {state && (
        <>
          {isAdmin && (
            <form
              onSubmit={onSaveOpens}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <label htmlFor={`${baseId}-opens`} className="block text-sm font-semibold">
                Начало приёма заявок
              </label>
              <p className="mt-1 text-xs text-muted">Время варшавское. Пустое поле — приём ещё не открыт.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id={`${baseId}-opens`}
                  type="datetime-local"
                  value={opensInput}
                  onChange={(e) => setOpensInput(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={savingOpens}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingOpens ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          )}

          {closedText && <p className="text-sm">{closedText}</p>}

          {error && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-red-600 outline-none">
              {error}
            </p>
          )}
          {notice && <p className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}

          {isAdmin && (
            <fieldset className="rounded-xl border border-border bg-surface p-5">
              <legend className="px-1 text-sm font-semibold">Просмотр формы</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["off", "Обычный режим"],
                    ["linked", "С привязанным ID"],
                    ["noid", "Без привязанного ID"],
                    ["guest", "Гость"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-accent/40 ${
                      preview === value ? "border-accent bg-accent/10 font-semibold" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${baseId}-preview`}
                      checked={preview === value}
                      onChange={() => {
                        setPreview(value);
                        setSource(null);
                        setSelectedTeam(null);
                        setQuery("");
                        setUseAccountEmail(false);
                        setError(null);
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {preview !== "off" && (
                <fieldset className="mt-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Состояние заявки
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        ["before", "До заявки"],
                        ["after", "После заявки"],
                      ] as const
                    ).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-accent/40 ${
                          previewPhase === value ? "border-accent bg-accent/10 font-semibold" : "border-border"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${baseId}-preview-phase`}
                          checked={previewPhase === value}
                          onChange={() => {
                            setPreviewPhase(value);
                            setError(null);
                            setInvalidField(null);
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {preview !== "off" && (
                <p className="mt-3 text-xs text-muted">
                  Заявки из этого просмотра сохраняются как тестовые и не видны в публичном списке.
                  {previewPhase === "after"
                    ? " «Пример команды» только в этом просмотре и в базу не записывается."
                    : ""}
                </p>
              )}
            </fieldset>
          )}

          {showAppliedPreview && (
            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Заявка принята: «{PREVIEW_TEAM_NAME}».
            </p>
          )}

          {showApplicationForm && (
            <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-5" noValidate>
              <div>
                <h2 className="text-sm font-bold">Приём заявок</h2>
                {testSubmit && (
                  <p className="mt-1 text-xs text-muted">
                    Тестовая заявка. Её видят только администраторы, в общий список она не попадает.
                  </p>
                )}
              </div>

              {showOwn && (
                <button
                  type="button"
                  aria-pressed={source === "own"}
                  onClick={() => {
                    setSource("own");
                    setSelectedTeam(null);
                    setQuery("");
                    setFreeName("");
                    setError(null);
                  }}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    source === "own" ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"
                  }`}
                >
                  {state.viewer.ownTeamName
                    ? `Заявить свою команду «${state.viewer.ownTeamName}»`
                    : "Заявить свою команду"}
                </button>
              )}

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={source === "free"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSource("free");
                      setSelectedTeam(null);
                      setQuery("");
                    } else {
                      setSource(null);
                      setFreeName("");
                    }
                  }}
                  className="rounded"
                />
                Команды нет в рейтинге
              </label>

              {source === "free" ? (
                <div>
                  <label htmlFor={`${baseId}-free`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Название команды
                  </label>
                  <input
                    id={`${baseId}-free`}
                    ref={freeRef}
                    value={freeName}
                    onChange={(e) => setFreeName(e.target.value)}
                    aria-invalid={invalidField === "free"}
                    className={inputClass}
                  />
                </div>
              ) : (
                <div ref={searchRef} className="relative">
                  <label htmlFor={`${baseId}-team`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Команда
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40">
                    {searching ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" aria-hidden="true" />
                    ) : (
                      <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    )}
                    <input
                      id={`${baseId}-team`}
                      ref={teamRef}
                      value={query}
                      aria-invalid={invalidField === "team"}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        if (selectedTeam || source === "own") {
                          setSelectedTeam(null);
                          setSource(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setShowDropdown(false);
                      }}
                      placeholder="Название или ID на rating.chgk.info"
                      autoComplete="off"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
                    />
                    {(query || selectedTeam) && (
                      <button
                        type="button"
                        aria-label="Очистить команду"
                        onClick={() => {
                          setQuery("");
                          setSelectedTeam(null);
                          if (source === "rating") setSource(null);
                        }}
                        className="text-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {showDropdown && results.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                      {results.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeam(t);
                            setQuery(t.name);
                            setSource("rating");
                            setShowDropdown(false);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-surface-hover"
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
              )}

              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={oneTime}
                    onChange={(e) => {
                      setOneTime(e.target.checked);
                      if (!e.target.checked) setDisplayName("");
                    }}
                    className="rounded"
                  />
                  Разовое название
                </label>
                {oneTime && (
                  <input
                    ref={oneTimeRef}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    aria-invalid={invalidField === "oneTime"}
                    aria-label="Разовое название"
                    placeholder="Название для этого турнира"
                    className={`${inputClass} mt-2`}
                  />
                )}
              </div>

              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Контакт
                </legend>
                <div className="space-y-2">
                  {(
                    [
                      ["EMAIL", "Email"],
                      ["TELEGRAM", "Telegram"],
                      ["OTHER", "Другой способ контакта"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`${baseId}-contact`}
                        checked={contactKind === value}
                        onChange={() => {
                          setContactKind(value);
                          setContactValue("");
                          setUseAccountEmail(false);
                        }}
                        className="rounded-full"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {contactKind === "EMAIL" && (
                  <div className="mt-3 space-y-2">
                    {showAccountEmail && (
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={useAccountEmail}
                          onChange={(e) => setUseAccountEmail(e.target.checked)}
                          className="rounded"
                        />
                        Использовать email, с которым вы вошли
                        <span className="text-muted">({state.viewer.email})</span>
                      </label>
                    )}
                    {!(showAccountEmail && useAccountEmail) && (
                      <input
                        ref={contactRef}
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        value={contactValue}
                        onChange={(e) => setContactValue(e.target.value)}
                        aria-invalid={invalidField === "contact"}
                        aria-label="Email"
                        className={inputClass}
                      />
                    )}
                  </div>
                )}
                {contactKind === "TELEGRAM" && (
                  <input
                    ref={contactRef}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    aria-invalid={invalidField === "contact"}
                    aria-label="Telegram"
                    placeholder="@username"
                    autoComplete="off"
                    className={`${inputClass} mt-3`}
                  />
                )}
                {contactKind === "OTHER" && (
                  <input
                    ref={contactRef}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    aria-invalid={invalidField === "contact"}
                    aria-label="Другой способ контакта"
                    className={`${inputClass} mt-3`}
                  />
                )}
              </fieldset>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                {testSubmit ? "Отправить тестовую заявку" : "Подать заявку"}
              </button>
            </form>
          )}

          <section id="page-ochp-teams" aria-labelledby={`${baseId}-list`}>
            <h2 id={`${baseId}-list`} className="text-sm font-bold">
              Заявившиеся команды
            </h2>
            {publicTeams.length === 0 && testPreview.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Пока никто не заявился.</p>
            ) : (
              <>
                {publicTeams.length > 0 && (
                  <TeamsTable teams={publicTeams} contacts={isAdmin ? contacts : undefined} />
                )}
                {isAdmin && testPreview.length > 0 && (
                  <div className={publicTeams.length > 0 ? "mt-4" : "mt-2"}>
                    <p className="text-xs text-muted">
                      {state.teams.length === 0
                        ? "Так список увидят все. Сейчас это тестовые заявки, другим пользователям список пуст."
                        : "Предпросмотр тестовых заявок. В общий список они не попадают."}
                    </p>
                    <TeamsTable teams={testPreview} />
                  </div>
                )}
              </>
            )}
          </section>

          {isAdmin && (
            <section aria-labelledby={`${baseId}-tests`} className="rounded-xl border border-dashed border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={`${baseId}-tests`} className="text-sm font-bold">
                    Тестовые заявки
                  </h2>
                  <p className="mt-1 text-xs text-muted">Видны только администраторам.</p>
                </div>
                {(state.testTeams?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => void removeTest(null)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Удалить все тестовые
                  </button>
                )}
              </div>
              {(state.testTeams?.length ?? 0) === 0 ? (
                <p className="mt-2 text-sm text-muted">Тестовых заявок нет.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {state.testTeams?.map((team) => (
                    <li key={team.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {team.name} <span className="font-normal text-muted">· тест</span>
                        </p>
                        <p className="text-xs text-muted">
                          {contactLabel(team.contactKind)}: {team.contactValue}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeTest(team.id)}
                        className="shrink-0 text-sm text-red-600 hover:underline"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
