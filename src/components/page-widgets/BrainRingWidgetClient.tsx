"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Loader2, RefreshCw, Settings2, Search, X } from "lucide-react";
import { useToast } from "@/components/Toaster";
import { BrainRingResults } from "@/components/page-widgets/BrainRingResults";
import {
  PRESET_LABELS,
  ROUND_LABELS,
  SOPOT_REMATRIX,
  SOPOT_STAGE1_LETTERS,
  SOPOT_TABS,
  allGroups,
  clampQuestionCount,
  emptyScheme,
  isSopotPreset,
  liveSectionIds,
  parseSopotTeamList,
  playoffSlots,
  playingTeamIds,
  snakeSopotNames,
  scoreLine,
  sopotCombinedStandings,
  sopotGroupStandings,
  sopotSectionsForTab,
  sopotStage1Groups,
  tiedClusters,
  type BrainPresetId,
  type BrainRingMatchDto,
  type BrainRingPublicGroup,
  type BrainRingScheme,
  type SopotTabId,
} from "@/lib/brain-ring";
import { BRAIN_PRESETS } from "@/lib/brain-ring-presets";

interface BrainHost {
  id: string;
  name: string | null;
  email: string | null;
}

interface BrainPayload {
  widgetId: string;
  title: string;
  path: string;
  canModerate: boolean;
  canEditScheme?: boolean;
  canScore?: boolean;
  canAssignHosts?: boolean;
  canReset?: boolean;
  hosts?: BrainHost[];
  event: {
    id: string;
    questionCount: number;
    scheme: BrainRingScheme;
    groups: BrainRingPublicGroup[];
    finals: BrainRingMatchDto[];
    matches: BrainRingMatchDto[];
    live: BrainRingMatchDto | null;
    updatedAt: string;
  } | null;
}

type ModTab = "scheme" | "live";

function matchLabel(m: BrainRingMatchDto): string {
  const names = m.teamNames.length ? m.teamNames.join(" — ") : `${m.teamAName} — ${m.teamBName}`;
  const score = scoreLine(m);
  const round = ROUND_LABELS[m.round] ?? m.round;
  const st = m.status === "finished" ? "завершён" : m.status === "started" ? "идёт" : "не начат";
  if (m.kind === "finals" || m.kind === "bracket") {
    return `${round}: ${names} (${score}) · ${st}`;
  }
  return `${m.playOrder}. ${names} (${score}) · ${st}`;
}

function hostLabel(u: { name: string | null; email: string | null }): string {
  return u.name?.trim() || u.email || "Пользователь";
}

function HostsPanel({
  hosts,
  eventReady,
  busy,
  onAdd,
  onRemove,
}: {
  hosts: BrainHost[];
  eventReady: boolean;
  busy: boolean;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<BrainHost[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/brain-ring/users?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((json: unknown) => setHits(Array.isArray(json) ? json : []))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const assigned = new Set(hosts.map((h) => h.id));
  const available = hits.filter((u) => !assigned.has(u.id));

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <div className="mb-3 text-sm font-semibold text-amber-900">Ведущие</div>
      {!eventReady ? (
        <p className="text-xs text-amber-800">Сначала сохраните схему турнира — после этого можно назначить ведущих.</p>
      ) : (
        <>
          {hosts.length === 0 ? (
            <p className="mb-3 text-xs text-amber-800">
              Пока никто не назначен. Ведущий может вести счёт и начинать/завершать бои без роли модератора.
            </p>
          ) : (
            <ul className="mb-3 space-y-1">
              {hosts.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {hostLabel(h)}
                    {h.email && h.name ? <span className="ml-1.5 text-xs text-muted">{h.email}</span> : null}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemove(h.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="block">
            <span className="mb-1 block text-xs text-amber-900">Добавить из зарегистрированных</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по имени или email…"
                className="w-full rounded-lg border border-amber-200 bg-white py-1.5 pl-8 pr-3 text-sm"
              />
            </div>
          </label>
          {searching ? <p className="mt-1 text-xs text-muted">Поиск…</p> : null}
          {available.length > 0 ? (
            <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-amber-200 bg-white">
              {available.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onAdd(u.id);
                      setQ("");
                      setHits([]);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-amber-50 disabled:opacity-50"
                  >
                    {hostLabel(u)}
                    {u.email ? <span className="ml-1.5 text-xs text-muted">{u.email}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : q.trim().length >= 2 && !searching ? (
            <p className="mt-1 text-xs text-muted">Никого не найдено</p>
          ) : null}
        </>
      )}
    </div>
  );
}

function SopotStageTabs({
  value,
  onChange,
  tone,
}: {
  value: SopotTabId;
  onChange: (tab: SopotTabId) => void;
  tone: "mod" | "public";
}) {
  const wrap =
    tone === "mod"
      ? "flex flex-wrap rounded-lg border border-amber-200 bg-white p-0.5"
      : "flex flex-wrap rounded-lg border border-border bg-surface p-0.5";
  const activeCls =
    tone === "mod" ? "bg-amber-100 text-amber-950" : "bg-accent/10 text-foreground";
  const idleCls =
    tone === "mod" ? "text-amber-800 hover:bg-amber-50" : "text-muted hover:bg-surface/80";
  return (
    <div className={wrap} role="tablist" aria-label="Этапы Сопотской">
      {SOPOT_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${value === t.id ? activeCls : idleCls}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function sopotResultsForTab(
  groups: BrainRingPublicGroup[],
  finals: BrainRingMatchDto[],
  tab: SopotTabId,
): { groups: BrainRingPublicGroup[]; finals: BrainRingMatchDto[] } {
  if (tab === "stage1") {
    return {
      groups: groups.filter((g) => (SOPOT_STAGE1_LETTERS as readonly string[]).includes(g.letter)),
      finals: [],
    };
  }
  if (tab === "stage2") {
    return {
      groups: groups.filter((g) => !(SOPOT_STAGE1_LETTERS as readonly string[]).includes(g.letter) && !g.isCombined),
      finals: [],
    };
  }
  if (tab === "combined") {
    return { groups: groups.filter((g) => Boolean(g.isCombined)), finals: [] };
  }
  return { groups: [], finals };
}

function CaptureGrid({
  match,
  busy,
  onCapture,
}: {
  match: BrainRingMatchDto;
  busy: boolean;
  onCapture: (matchId: string, questionIndex: number, teamId: string | false) => void;
}) {
  if (match.teamIds.length < 2) return null;
  return (
    <div className="grid gap-2">
      {match.captures.map((cap, idx) => (
        <div key={idx} className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white p-2">
          <span className="w-6 shrink-0 text-center font-mono text-xs text-muted">{idx + 1}</span>
          {match.teamIds.map((tid, ti) => (
            <button
              key={tid}
              type="button"
              disabled={busy}
              onClick={() => onCapture(match.id, idx, tid)}
              className={`min-w-0 flex-1 truncate rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                cap === tid ? "bg-emerald-600 text-white" : "bg-zinc-100 hover:bg-zinc-200"
              }`}
            >
              {match.teamNames[ti] ?? tid}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => onCapture(match.id, idx, false)}
            className={`shrink-0 rounded px-1.5 py-1 text-[10px] font-medium ${
              cap === false ? "bg-zinc-500 text-white" : "bg-zinc-100 text-muted hover:bg-zinc-200"
            }`}
            title="Сбросить"
          >
            —
          </button>
        </div>
      ))}
    </div>
  );
}

export function BrainRingWidgetClient({ widgetId }: { widgetId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<BrainPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ModTab>("scheme");
  const [sopotTab, setSopotTab] = useState<SopotTabId>("stage1");
  const [draft, setDraft] = useState<BrainRingScheme>(() => emptyScheme("olympic", { teamCount: 8 }));
  const [sources, setSources] = useState<Array<{ id: string; title: string; teamCount: number }>>([]);
  const [sourceId, setSourceId] = useState("");
  const [selectedBySection, setSelectedBySection] = useState<Record<string, string>>({});
  const [pasteList, setPasteList] = useState("");
  const schemeTouched = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/brain-ring/${encodeURIComponent(widgetId)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("load failed");
    const json = (await res.json()) as BrainPayload;
    setData(json);
    if (!schemeTouched.current) {
      if (json.event) setDraft(json.event.scheme);
      else setDraft(emptyScheme("olympic", { teamCount: 8 }));
    }
    if (json.canScore && !json.canEditScheme) setTab("live");
    return json;
  }, [widgetId]);

  useEffect(() => {
    let cancelled = false;
    schemeTouched.current = false;
    setLoading(true);
    load()
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const id = setInterval(() => {
      void load().catch(() => {});
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    if (!data?.canEditScheme) return;
    fetch("/api/brain-ring/participant-sources")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((json: { events?: Array<{ id: string; title: string; teamCount: number }> }) => {
        setSources(json.events ?? []);
      })
      .catch(() => {});
  }, [data?.canEditScheme]);

  async function onAction(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await fetch(`/api/brain-ring/${encodeURIComponent(widgetId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = (await res.json()) as BrainPayload & { error?: string };
      if (!res.ok) {
        toast(json.error ?? "Не удалось сохранить", "error");
        return;
      }
      setData(json);
      if (json.event) {
        schemeTouched.current = false;
        setDraft(json.event.scheme);
      }
    } catch {
      toast("Не удалось сохранить", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveScheme(e: FormEvent) {
    e.preventDefault();
    if (data?.event && !window.confirm("Сохранить схему заново? Результаты матчей будут сброшены.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/brain-ring/${encodeURIComponent(widgetId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheme: draft }),
      });
      const json = (await res.json()) as BrainPayload & { error?: string };
      if (!res.ok) {
        toast(json.error ?? "Не удалось сохранить схему", "error");
        return;
      }
      setData(json);
      if (json.event) {
        schemeTouched.current = false;
        setDraft(json.event.scheme);
      }
      setTab("live");
      toast("Схема сохранена", "success");
    } catch {
      toast("Не удалось сохранить схему", "error");
    } finally {
      setBusy(false);
    }
  }

  function rebuild(patch: Partial<BrainRingScheme> & { preset?: BrainPresetId; names?: string[] }) {
    schemeTouched.current = true;
    setDraft((prev) =>
      emptyScheme(patch.preset ?? prev.preset, {
        questionCount: patch.questionCount ?? prev.questionCount,
        matchSize: patch.matchSize ?? prev.matchSize,
        teamCount: patch.teamCount ?? prev.teamCount,
        thirdPlace: patch.thirdPlace ?? prev.thirdPlace,
        groupCount: patch.groupCount ?? prev.groupCount,
        groupSize: patch.groupSize ?? prev.groupSize,
        names: patch.names ?? prev.teams.map((t) => t.name),
        prev,
      }),
    );
  }

  async function fillFromEvent() {
    if (!sourceId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/brain-ring/participant-sources?eventId=${encodeURIComponent(sourceId)}`,
      );
      const json = (await res.json()) as { names?: string[]; error?: string };
      if (!res.ok) {
        toast(json.error ?? "Не удалось загрузить команды", "error");
        return;
      }
      const names = json.names ?? [];
      rebuild({
        names,
        teamCount:
          draft.preset === "ochp-16"
            ? 16
            : draft.preset === "sopot"
              ? 20
              : draft.preset === "groups"
                ? draft.teamCount
                : names.length || draft.teamCount,
      });
      toast("Команды подставлены — проверьте состав и сохраните", "success");
    } catch {
      toast("Не удалось загрузить команды", "error");
    } finally {
      setBusy(false);
    }
  }

  const matchesBySection = useMemo(() => {
    const map = new Map<string, BrainRingMatchDto[]>();
    for (const m of data?.event?.matches ?? []) {
      const list = map.get(m.sectionId) ?? [];
      list.push(m);
      map.set(m.sectionId, list);
    }
    return map;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
        Не удалось загрузить брейн-ринг
      </div>
    );
  }

  const event = data.event;
  const canEditScheme = Boolean(data.canEditScheme);
  const canScore = Boolean(data.canScore);
  const canAssignHosts = Boolean(data.canAssignHosts);
  const canReset = Boolean(data.canReset);
  const canModerate = canEditScheme || canScore;
  const hosts = data.hosts ?? [];
  const showMatchSize = draft.preset === "rr" || draft.preset === "groups" || draft.preset === "nway";
  const showGroups = draft.preset === "groups";
  const showOlympic = draft.preset === "olympic";
  const showTeamCount = draft.preset !== "ochp-16" && draft.preset !== "groups" && draft.preset !== "sopot";
  const sopot = isSopotPreset(draft.preset);
  const eventSopot = Boolean(event && isSopotPreset(event.scheme.preset));
  const liveSections = event
    ? eventSopot
      ? sopotSectionsForTab(sopotTab, liveSectionIds(event.scheme, event.matches))
      : liveSectionIds(event.scheme, event.matches)
    : [];
  const sopotView = eventSopot
    ? sopotResultsForTab(event!.groups, event!.finals, sopotTab)
    : null;

  function applyPastedTeams() {
    const names = parseSopotTeamList(pasteList);
    if (names.length === 0) return;
    rebuild({ names: snakeSopotNames(names) });
  }

  function setTeamName(teamId: string, name: string) {
    schemeTouched.current = true;
    setDraft((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
    }));
  }

  function setStageQuestionCount(stageId: string, n: number) {
    schemeTouched.current = true;
    setDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === stageId ? { ...s, questionCount: clampQuestionCount(n) } : s)),
    }));
  }

  function setGroupMeta(letter: string, patch: { venue?: string; time?: string }) {
    schemeTouched.current = true;
    setDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => {
        if (s.type !== "groups") return s;
        return {
          ...s,
          groups: s.groups.map((g) => (g.letter === letter ? { ...g, ...patch } : g)),
        };
      }),
    }));
  }

  return (
    <div id="page-widget-brain" className="space-y-6">
      {canAssignHosts ? (
        <HostsPanel
          hosts={hosts}
          eventReady={Boolean(event)}
          busy={busy}
          onAdd={(userId) => void onAction("add-host", { userId })}
          onRemove={(userId) => void onAction("remove-host", { userId })}
        />
      ) : null}

      {canModerate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <Settings2 className="h-4 w-4" />
              {canEditScheme ? "Панель модератора" : "Ход боя"}
            </div>
            {canEditScheme && canScore ? (
              <div className="flex rounded-lg border border-amber-200 bg-white p-0.5">
                <button
                  type="button"
                  aria-pressed={tab === "scheme"}
                  onClick={() => setTab("scheme")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    tab === "scheme" ? "bg-amber-100 text-amber-950" : "text-amber-800 hover:bg-amber-50"
                  }`}
                >
                  Схема турнира
                </button>
                <button
                  type="button"
                  aria-pressed={tab === "live"}
                  onClick={() => setTab("live")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    tab === "live" ? "bg-amber-100 text-amber-950" : "text-amber-800 hover:bg-amber-50"
                  }`}
                >
                  Ход боя
                </button>
              </div>
            ) : null}
          </div>

          {canEditScheme && (tab === "scheme" || !canScore) ? (
            <form onSubmit={(e) => void onSaveScheme(e)} className="space-y-4">
              <label className="block max-w-lg">
                <span className="mb-1 block text-xs text-amber-900">Пресет</span>
                <select
                  value={draft.preset}
                  onChange={(e) => rebuild({ preset: e.target.value as BrainPresetId })}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                >
                  {BRAIN_PRESETS.map((id) => (
                    <option key={id} value={id}>
                      {PRESET_LABELS[id]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-amber-800">{presetHint(draft.preset)}</p>

              <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
                {sopot ? (
                  draft.stages.map((stage) => (
                    <label key={stage.id} className="block">
                      <span className="mb-1 block text-xs text-amber-900">
                        Вопросы · {stage.name}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={stage.questionCount}
                        onChange={(e) => setStageQuestionCount(stage.id, Number(e.target.value))}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                      />
                    </label>
                  ))
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-xs text-amber-900">Количество вопросов</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={draft.questionCount}
                      onChange={(e) => rebuild({ questionCount: clampQuestionCount(e.target.value) })}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                    />
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block text-xs text-amber-900">Количество этапов</span>
                  <input
                    type="number"
                    readOnly
                    value={draft.stages.length}
                    className="w-full rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-sm text-amber-900"
                  />
                </label>
                {showTeamCount ? (
                  <label className="block">
                    <span className="mb-1 block text-xs text-amber-900">Количество команд</span>
                    <input
                      type="number"
                      min={2}
                      max={32}
                      value={draft.teamCount}
                      onChange={(e) => rebuild({ teamCount: Number(e.target.value) || 2 })}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                    />
                  </label>
                ) : null}
                {showMatchSize ? (
                  <label className="block">
                    <span className="mb-1 block text-xs text-amber-900">Команд в бою</span>
                    <input
                      type="number"
                      min={2}
                      max={5}
                      value={draft.matchSize}
                      onChange={(e) => rebuild({ matchSize: Number(e.target.value) || 2 })}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                    />
                  </label>
                ) : null}
                {showGroups ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs text-amber-900">Число групп</span>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={draft.groupCount}
                        onChange={(e) => rebuild({ groupCount: Number(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-amber-900">Команд в группе</span>
                      <input
                        type="number"
                        min={3}
                        max={10}
                        value={draft.groupSize}
                        onChange={(e) => rebuild({ groupSize: Number(e.target.value) || 3 })}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                      />
                    </label>
                  </>
                ) : null}
                {showOlympic ? (
                  <label className="flex items-center gap-2 pt-6 text-sm text-amber-950">
                    <input
                      type="checkbox"
                      checked={draft.thirdPlace}
                      onChange={(e) => rebuild({ thirdPlace: e.target.checked })}
                    />
                    Матч за 3-е место
                  </label>
                ) : null}
              </div>

              {sources.length > 0 ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[12rem] flex-1">
                    <span className="mb-1 block text-xs text-amber-900">Команды с турнира</span>
                    <select
                      value={sourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                    >
                      <option value="">— выбрать —</option>
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.teamCount})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={busy || !sourceId}
                    onClick={() => void fillFromEvent()}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                  >
                    Подставить в сетку
                  </button>
                </div>
              ) : null}

              {sopot ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs text-amber-900">
                      Список команд (по одному в строке) — распределить по А Б В Г
                    </span>
                    <textarea
                      value={pasteList}
                      onChange={(e) => setPasteList(e.target.value)}
                      onBlur={() => applyPastedTeams()}
                      rows={8}
                      placeholder={"Команда 1\nКоманда 2\n…\nКоманда 20"}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-amber-800">
                      Этот виджет — один зачёт из 20. Второй список (21–40) вставляйте в другой виджет. Можно через запятую, точку с запятой или таб.
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => applyPastedTeams()}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
                  >
                    Распределить
                  </button>
                  <div className="text-xs font-semibold text-amber-900">Группы А–Г · пустое имя = не играет</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {allGroups(draft)
                      .filter((g) => ["А", "Б", "В", "Г"].includes(g.letter))
                      .map((g) => (
                        <div key={g.letter} className="rounded-lg border border-amber-200 bg-white/70 p-3">
                          <div className="mb-2 text-xs font-bold text-amber-950">Группа {g.letter}</div>
                          <div className="mb-2 grid grid-cols-2 gap-2">
                            <input
                              value={g.venue}
                              onChange={(e) => setGroupMeta(g.letter, { venue: e.target.value })}
                              placeholder="Зал"
                              className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-sm"
                            />
                            <input
                              value={g.time}
                              onChange={(e) => setGroupMeta(g.letter, { time: e.target.value })}
                              placeholder="Время"
                              className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            {g.teamIds.map((id, i) => {
                              const team = draft.teams.find((t) => t.id === id);
                              return (
                                <input
                                  key={id}
                                  value={team?.name ?? ""}
                                  onChange={(e) => setTeamName(id, e.target.value)}
                                  placeholder={`Слот ${i + 1} · пусто = отказ`}
                                  className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-white/60 p-3 text-xs text-amber-900">
                    <div className="mb-1 font-semibold">Этап 2 · переразбивка (заморожена)</div>
                    {SOPOT_REMATRIX.map((row) => (
                      <div key={row.letter}>
                        {row.letter} — {row.slots.map((s) => `${s.group}${s.place}`).join(", ")}
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {allGroups(draft)
                      .filter((g) => ["E", "F", "G", "H"].includes(g.letter))
                      .map((g) => (
                        <div key={g.letter} className="grid grid-cols-2 gap-2">
                          <span className="col-span-2 text-xs font-semibold text-amber-900">Группа {g.letter}</span>
                          <input
                            value={g.venue}
                            onChange={(e) => setGroupMeta(g.letter, { venue: e.target.value })}
                            placeholder="Зал"
                            className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-sm"
                          />
                          <input
                            value={g.time}
                            onChange={(e) => setGroupMeta(g.letter, { time: e.target.value })}
                            placeholder="Время"
                            className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-sm"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-900">Команды</div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {draft.teams.map((t, i) => (
                      <input
                        key={t.id}
                        value={t.name}
                        onChange={(e) => setTeamName(t.id, e.target.value)}
                        placeholder={`Команда ${i + 1}`}
                        className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              {draft.stages.map((stage, si) => (
                <div key={stage.id} className="rounded-lg border border-amber-200 bg-white/60 p-3 text-xs text-amber-900">
                  <div className="font-semibold">
                    Этап {si + 1}. {stage.name}
                  </div>
                  <p className="mt-1 text-amber-800">{stageSummary(draft, stage.id)}</p>
                </div>
              ))}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Сохранить схему
              </button>
            </form>
          ) : null}

          {canScore && (tab === "live" || !canEditScheme) ? (
            event ? (
              <div className="space-y-4">
                {eventSopot ? (
                  <>
                    <SopotStageTabs value={sopotTab} onChange={setSopotTab} tone="mod" />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {sopotTab === "stage2" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm("Заполнить этап 2 из мест групп А–Г? Пустые слоты E–H будут записаны; начатые бои не сбрасываются.")) return;
                            void onAction("fill-stage-2");
                          }}
                          className="text-xs text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950 disabled:opacity-50"
                        >
                          Заполнить этап 2 вручную
                        </button>
                      ) : null}
                      {sopotTab === "final" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm("Заполнить финал из общей таблицы? Пустой финал будет записан; начатый бой не сбрасывается.")) return;
                            void onAction("fill-final");
                          }}
                          className="text-xs text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950 disabled:opacity-50"
                        >
                          Заполнить финал вручную
                        </button>
                      ) : null}
                      {sopotTab === "combined" &&
                      tiedClusters(
                        sopotCombinedStandings(
                          event.scheme.teams,
                          sopotStage1Groups(event.scheme),
                          event.matches,
                          event.scheme.overallTieBreak ?? [],
                        ),
                      ).length > 0 ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm("Жребий общей таблицы? Порядок равных команд будет выбран случайно.")) return;
                            void onAction("lottery-overall");
                          }}
                          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                        >
                          Жребий общей таблицы
                        </button>
                      ) : null}
                    </div>
                    {sopotTab === "combined" ? (
                      <p className="text-xs text-amber-800">Таблица строится только по завершённым боям — см. ниже.</p>
                    ) : null}
                  </>
                ) : playoffSlots(event.scheme).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {event.scheme.preset === "ochp-16" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onAction("fill-semis")}
                          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                        >
                          Заполнить полуфиналы
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onAction("fill-finals")}
                          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                        >
                          Заполнить финал и матч за 3-е
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onAction("fill-bracket")}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                      >
                        Заполнить сетку
                      </button>
                    )}
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-2">
                  {liveSections.map((sectionId) => {
                    const list = matchesBySection.get(sectionId) ?? [];
                    const active = list.find((m) => m.active) ?? null;
                    const group = allGroups(event.scheme).find((g) => g.id === sectionId);
                    const stage = event.scheme.stages.find((s) => s.id === sectionId);
                    const title = group
                      ? `Группа ${group.letter}`
                      : stage?.name ?? ROUND_LABELS[list[0]?.round ?? ""] ?? list[0]?.round ?? sectionId;
                    const groupTies =
                      group &&
                      event.scheme.preset === "sopot" &&
                      sopotStage1Groups(event.scheme).some((g) => g.id === group.id)
                        ? tiedClusters(sopotGroupStandings(group, event.scheme.teams, event.matches))
                        : [];
                    const selectedId = selectedBySection[sectionId] ?? active?.id ?? "";
                    const selected = list.find((m) => m.id === selectedId) ?? null;
                    return (
                      <div key={sectionId} className="rounded-lg border border-amber-200 bg-white/80 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="block text-xs font-semibold text-amber-900">{title}</label>
                          {groupTies.length > 0 ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (!window.confirm(`Жребий в группе ${group!.letter}? Порядок равных команд будет выбран случайно.`)) return;
                                void onAction("lottery-group", { letter: group!.letter });
                              }}
                              className="rounded border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-medium hover:bg-amber-100 disabled:opacity-50"
                            >
                              Жребий
                            </button>
                          ) : null}
                        </div>
                        <select
                          className="mb-3 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
                          value={selectedId}
                          disabled={busy || list.length === 0}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSelectedBySection((prev) => ({ ...prev, [sectionId]: id }));
                            if (!id) {
                              void onAction("clear-active", { sectionId });
                              return;
                            }
                            const m = list.find((x) => x.id === id);
                            if (m?.status === "started") void onAction("set-active", { matchId: id });
                          }}
                        >
                          <option value="">— выберите матч —</option>
                          {list.map((m) => (
                            <option key={m.id} value={m.id}>
                              {matchLabel(m)}
                            </option>
                          ))}
                        </select>
                        {selected && selected.teamIds.length < 2 ? (
                          <p className="text-xs text-amber-800">Сначала заполните сетку или назначьте команды.</p>
                        ) : null}
                        {selected && selected.teamIds.length >= 2 && selected.status === "idle" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onAction("start-match", { matchId: selected.id })}
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                          >
                            Начать бой
                          </button>
                        ) : null}
                        {selected && selected.teamIds.length >= 2 && selected.status === "started" ? (
                          <div>
                            <p className="mb-2 text-xs text-amber-800">
                              {selected.teamNames.join(" vs ")} · <strong>{scoreLine(selected)}</strong>
                              {` · вопрос ${selected.currentQuestion + 1}`}
                            </p>
                            <CaptureGrid
                              match={selected}
                              busy={busy}
                              onCapture={(matchId, questionIndex, teamId) =>
                                void onAction("set-capture", { matchId, questionIndex, teamId })
                              }
                            />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onAction("finish-match", { matchId: selected.id })}
                              className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                            >
                              Завершить бой
                            </button>
                          </div>
                        ) : null}
                        {selected && selected.status === "finished" ? (
                          <div>
                            <p className="text-xs text-amber-800">
                              {selected.teamNames.join(" vs ")} · <strong>{scoreLine(selected)}</strong> · бой завершён,
                              результат в таблице
                            </p>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onAction("edit-match", { matchId: selected.id })}
                              className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                            >
                              Редактировать
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-amber-800">Сначала сохраните схему турнира.</p>
            )
          ) : null}

          {canReset && event ? (
            <div className="mt-4 border-t border-amber-200 pt-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Очистить все результаты и вернуть турнир в начальное состояние? Схема и команды сохранятся, матчи станут неначатыми.",
                    )
                  ) {
                    return;
                  }
                  void onAction("reset-results");
                }}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
              >
                Очистить все результаты и вернуть в начальное состояние
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {event?.live && event.live.teamIds.length >= 2 ? (
        <div className="rounded-xl border border-accent/30 bg-surface px-4 py-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">Сейчас · ход боя</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {event.live.teamNames.map((name, i) => (
              <span key={event.live!.teamIds[i]} className="text-sm font-medium">
                {i > 0 ? <span className="mr-2 text-muted">:</span> : null}
                {name}{" "}
                <span className="font-mono font-bold tabular-nums">{event.live!.scores[i] ?? 0}</span>
              </span>
            ))}
          </div>
          <p className="mt-1 text-center text-xs text-muted">
            Вопрос {Math.min(event.live.currentQuestion + 1, event.live.questionCount)} из {event.live.questionCount}
          </p>
        </div>
      ) : null}

      {!event ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          {canModerate ? "Сохраните схему турнира, чтобы начать." : "Турнир ещё не начат."}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Обновление каждые 5 с
          </div>
          {eventSopot ? <SopotStageTabs value={sopotTab} onChange={setSopotTab} tone="public" /> : null}
          <BrainRingResults
            groups={sopotView ? sopotView.groups : event.groups}
            finals={sopotView ? sopotView.finals : event.finals}
            hideSections={eventSopot}
          />
        </div>
      )}
    </div>
  );
}

function presetHint(preset: BrainPresetId): string {
  switch (preset) {
    case "olympic":
      return "Олимпийская сетка: победитель проходит дальше. Если команд не 2ⁿ — часть получает bye.";
    case "double-elim":
      return "Две сетки: победители и проигравшие. Выбывание после двух поражений. Один гранд-финал.";
    case "rr":
      return "Одна общая группа: каждый играет с каждым. Размер боя 2–5 команд.";
    case "groups":
      return "Несколько независимых групп (3–10 команд). Плей-офф из групп пока не подключается.";
    case "nway":
      return "Бои на 3–5 команд: все сочетания такого размера. Очки как в парном бою (3 / 2 / 1 / 0).";
    case "ochp-16":
      return "Фиксированный шаблон ОЧП 1–16: 4 группы по 4, затем 1/2 · 3-е · финал.";
    case "sopot":
      return "Сопотская: 4×5 (А–Г) → вылет 5-х → 4×4 (E–H, переразбивка) → общая таблица 16 → финал четырёх. Пустой слот в этапе 1 = группа из 4, все выходят. Два зачёта = два виджета.";
  }
}

function stageSummary(scheme: BrainRingScheme, stageId: string): string {
  const stage = scheme.stages.find((s) => s.id === stageId);
  if (!stage) return "";
  if (stage.type === "groups") {
    if (scheme.preset === "sopot") {
      const sizes = stage.groups.map((g) => playingTeamIds(scheme.teams, g.teamIds).length);
      return `${stage.groups.map((g) => g.letter).join(" ")} · до ${Math.max(0, ...sizes)} команд, круговой 1×1, ${stage.questionCount} вопр.`;
    }
    return `${stage.groups.length} групп × ${stage.groups[0]?.teamIds.length ?? scheme.groupSize}, круговой, ${stage.questionCount} вопр., бой на ${scheme.matchSize}`;
  }
  if (stage.type === "rr") {
    if (scheme.preset === "sopot") {
      return `Финал четырёх, ${stage.questionCount} вопр., счёт a:b:c:d`;
    }
    return `${stage.teamIds.length} команд, бой на ${stage.matchSize}, ${stage.questionCount} вопр.`;
  }
  return `${stage.slots.length} матчей сетки, ${stage.questionCount} вопр.`;
}
