"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, RefreshCw, Settings2 } from "lucide-react";
import { useToast } from "@/components/Toaster";
import { BrainRingResults } from "@/components/page-widgets/BrainRingResults";
import {
  DEFAULT_QUESTION_COUNT,
  ROUND_LABELS,
  emptyOchp16Scheme,
  type BrainRingMatchDto,
  type BrainRingPublicGroup,
  type BrainRingScheme,
} from "@/lib/brain-ring";

interface BrainPayload {
  widgetId: string;
  title: string;
  path: string;
  canModerate: boolean;
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
  const score = `${m.scoreA}:${m.scoreB}`;
  if (m.kind === "finals") {
    return `${ROUND_LABELS[m.round] ?? m.round}: ${m.teamAName} — ${m.teamBName} (${score})`;
  }
  return `${m.playOrder}. ${m.teamAName} — ${m.teamBName} (${score})`;
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
  if (!match.teamAId || !match.teamBId) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {match.captures.map((cap, idx) => (
        <div key={idx} className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white p-2">
          <span className="w-6 shrink-0 text-center font-mono text-xs text-muted">{idx + 1}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onCapture(match.id, idx, match.teamAId)}
            className={`flex-1 truncate rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
              cap === match.teamAId ? "bg-emerald-600 text-white" : "bg-zinc-100 hover:bg-zinc-200"
            }`}
          >
            {match.teamAName}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onCapture(match.id, idx, match.teamBId)}
            className={`flex-1 truncate rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
              cap === match.teamBId ? "bg-emerald-600 text-white" : "bg-zinc-100 hover:bg-zinc-200"
            }`}
          >
            {match.teamBName}
          </button>
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
  const [draft, setDraft] = useState<BrainRingScheme>(() => emptyOchp16Scheme());
  const [sources, setSources] = useState<Array<{ id: string; title: string; teamCount: number }>>([]);
  const [sourceId, setSourceId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/brain-ring/${encodeURIComponent(widgetId)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("load failed");
    const json = (await res.json()) as BrainPayload;
    setData(json);
    if (json.event) setDraft(json.event.scheme);
    else setDraft(emptyOchp16Scheme());
    return json;
  }, [widgetId]);

  useEffect(() => {
    let cancelled = false;
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
    if (!data?.canModerate) return;
    fetch("/api/brain-ring/participant-sources")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((json: { events?: Array<{ id: string; title: string; teamCount: number }> }) => {
        setSources(json.events ?? []);
      })
      .catch(() => {});
  }, [data?.canModerate]);

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
      if (json.event) setDraft(json.event.scheme);
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
      if (json.event) setDraft(json.event.scheme);
      setTab("live");
      toast("Схема сохранена", "success");
    } catch {
      toast("Не удалось сохранить схему", "error");
    } finally {
      setBusy(false);
    }
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
      const next = emptyOchp16Scheme(json.names);
      next.questionCount = draft.questionCount;
      next.groups = next.groups.map((g, i) => ({
        ...g,
        letterName: draft.groups[i]?.letterName ?? "",
        venue: draft.groups[i]?.venue ?? "",
        time: draft.groups[i]?.time ?? "",
      }));
      setDraft(next);
      toast("Команды подставлены — проверьте группы и сохраните", "success");
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
  const canModerate = data.canModerate;

  function setTeamName(teamId: string, name: string) {
    setDraft((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
    }));
  }

  return (
    <div id="page-widget-brain" className="space-y-6">
      {canModerate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <Settings2 className="h-4 w-4" />
              Панель модератора
            </div>
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
          </div>

          {tab === "scheme" ? (
            <form onSubmit={(e) => void onSaveScheme(e)} className="space-y-4">
              <p className="text-xs text-amber-800">
                Шаблон как ОЧП 1–16: 16 команд, 4 группы по 4, круговой этап, затем полуфиналы, матч за 3-е и
                финал.
              </p>
              <label className="block max-w-xs">
                <span className="mb-1 block text-xs text-amber-900">Вопросов в бою</span>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={draft.questionCount}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, questionCount: Number(e.target.value) || DEFAULT_QUESTION_COUNT }))
                  }
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                />
              </label>
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

              <div className="grid gap-3 sm:grid-cols-2">
                {draft.groups.map((g, gi) => (
                  <div key={g.id} className="rounded-lg border border-amber-200 bg-white/80 p-3">
                    <div className="mb-2 text-xs font-semibold text-amber-900">Группа {g.letter}</div>
                    <input
                      value={g.letterName}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          groups: p.groups.map((x, i) => (i === gi ? { ...x, letterName: e.target.value } : x)),
                        }))
                      }
                      placeholder="Название (необязательно)"
                      className="mb-1.5 w-full rounded border border-amber-100 px-2 py-1 text-xs"
                    />
                    <div className="mb-2 grid grid-cols-2 gap-1.5">
                      <input
                        value={g.venue}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            groups: p.groups.map((x, i) => (i === gi ? { ...x, venue: e.target.value } : x)),
                          }))
                        }
                        placeholder="Площадка"
                        className="rounded border border-amber-100 px-2 py-1 text-xs"
                      />
                      <input
                        value={g.time}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            groups: p.groups.map((x, i) => (i === gi ? { ...x, time: e.target.value } : x)),
                          }))
                        }
                        placeholder="Время"
                        className="rounded border border-amber-100 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      {g.teamIds.map((tid) => {
                        const team = draft.teams.find((t) => t.id === tid);
                        return (
                          <input
                            key={tid}
                            value={team?.name ?? ""}
                            onChange={(e) => setTeamName(tid, e.target.value)}
                            placeholder="Команда"
                            className="w-full rounded-lg border border-amber-200 px-2 py-1.5 text-sm"
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {draft.playoff.map((p, pi) => (
                  <label key={p.id} className="block">
                    <span className="mb-1 block text-xs text-amber-900">
                      {ROUND_LABELS[p.round] ?? p.round} · площадка
                    </span>
                    <input
                      value={p.venue}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          playoff: prev.playoff.map((x, i) => (i === pi ? { ...x, venue: e.target.value } : x)),
                        }))
                      }
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>

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

          {tab === "live" ? (
            event ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
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
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {event.scheme.groups.map((g) => {
                    const list = matchesBySection.get(g.id) ?? [];
                    const active = list.find((m) => m.active) ?? null;
                    return (
                      <div key={g.id} className="rounded-lg border border-amber-200 bg-white/80 p-3">
                        <label className="mb-1 block text-xs font-semibold text-amber-900">
                          Группа {g.letter}
                        </label>
                        <select
                          className="mb-3 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
                          value={active?.id ?? ""}
                          disabled={busy || list.length === 0}
                          onChange={(e) => {
                            const id = e.target.value;
                            if (!id) void onAction("clear-active", { sectionId: g.id });
                            else void onAction("set-active", { matchId: id });
                          }}
                        >
                          <option value="">— выберите матч —</option>
                          {list.map((m) => (
                            <option key={m.id} value={m.id}>
                              {matchLabel(m)}
                            </option>
                          ))}
                        </select>
                        {active ? (
                          <div>
                            <p className="mb-2 text-xs text-amber-800">
                              {active.teamAName} vs {active.teamBName} ·{" "}
                              <strong>
                                {active.scoreA}:{active.scoreB}
                              </strong>
                              {active.complete ? " · завершён" : ` · вопрос ${active.currentQuestion + 1}`}
                            </p>
                            <CaptureGrid
                              match={active}
                              busy={busy}
                              onCapture={(matchId, questionIndex, teamId) =>
                                void onAction("set-capture", { matchId, questionIndex, teamId })
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Финалы</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(matchesBySection.get("finals") ?? []).map((m) => (
                      <div key={m.id} className="rounded-lg border border-amber-200 bg-white/80 p-3">
                        <div className="mb-2 text-xs font-semibold text-amber-900">
                          {ROUND_LABELS[m.round] ?? m.round}
                        </div>
                        {!m.teamAId || !m.teamBId ? (
                          <PlayoffAssign
                            match={m}
                            teams={event.scheme.teams}
                            busy={busy}
                            onAssign={(teamAId, teamBId) =>
                              void onAction("set-playoff-teams", { matchId: m.id, teamAId, teamBId })
                            }
                          />
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onAction("set-active", { matchId: m.id })}
                              className={`mb-2 w-full rounded-lg border px-2 py-1.5 text-left text-xs ${
                                m.active
                                  ? "border-amber-400 bg-amber-100"
                                  : "border-amber-200 bg-white hover:bg-amber-50"
                              }`}
                            >
                              {matchLabel(m)}
                            </button>
                            {m.active ? (
                              <CaptureGrid
                                match={m}
                                busy={busy}
                                onCapture={(matchId, questionIndex, teamId) =>
                                  void onAction("set-capture", { matchId, questionIndex, teamId })
                                }
                              />
                            ) : null}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-amber-800">Сначала сохраните схему турнира.</p>
            )
          ) : null}
        </div>
      ) : null}

      {event?.live && event.live.teamAId && event.live.teamBId ? (
        <div className="rounded-xl border border-accent/30 bg-surface px-4 py-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">Сейчас · ход боя</div>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-right text-sm font-medium">{event.live.teamAName}</span>
            <div className="rounded-lg bg-background px-3 py-1 font-mono text-sm font-bold tabular-nums">
              {event.live.scoreA}:{event.live.scoreB}
            </div>
            <span className="flex-1 text-sm font-medium">{event.live.teamBName}</span>
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
          <BrainRingResults groups={event.groups} finals={event.finals} />
        </div>
      )}
    </div>
  );
}

function PlayoffAssign({
  match,
  teams,
  busy,
  onAssign,
}: {
  match: BrainRingMatchDto;
  teams: BrainRingScheme["teams"];
  busy: boolean;
  onAssign: (teamAId: string, teamBId: string) => void;
}) {
  const [teamAId, setTeamAId] = useState(match.teamAId);
  const [teamBId, setTeamBId] = useState(match.teamBId);
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!teamAId || !teamBId) return;
        onAssign(teamAId, teamBId);
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <select
          value={teamAId}
          onChange={(e) => setTeamAId(e.target.value)}
          className="rounded border border-amber-200 px-2 py-1.5 text-xs"
        >
          <option value="">—</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.id}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">vs</span>
        <select
          value={teamBId}
          onChange={(e) => setTeamBId(e.target.value)}
          className="rounded border border-amber-200 px-2 py-1.5 text-xs"
        >
          <option value="">—</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.id}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || !teamAId || !teamBId}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Назначить
        </button>
      </div>
    </form>
  );
}
