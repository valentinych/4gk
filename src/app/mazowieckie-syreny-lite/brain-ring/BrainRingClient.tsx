"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Settings2,
  Trophy,
} from "lucide-react";
import type {
  BrainMatchDTO,
  BrainSectionDTO,
  BrainTournamentDTO,
} from "@/lib/syreny-lite-brain-store";

const GROUP_SECTIONS = new Set(["group-a", "group-b", "out-group"]);

function StandingsTable({ section }: { section: BrainSectionDTO }) {
  if (section.standings.length === 0) return null;
  return (
    <table className="w-full text-xs">
      <thead className="bg-zinc-50/50 text-[10px] uppercase tracking-wide text-muted">
        <tr>
          <th className="px-2 py-1.5 text-left">#</th>
          <th className="px-2 py-1.5 text-left">Команда</th>
          <th className="px-2 py-1.5 text-right" title="Игры">И</th>
          <th className="px-2 py-1.5 text-right" title="Победы">В</th>
          <th className="px-2 py-1.5 text-right" title="Ничьи">Н</th>
          <th className="px-2 py-1.5 text-right" title="Поражения">П</th>
          <th className="px-2 py-1.5 text-right" title="Забито">З</th>
          <th className="px-2 py-1.5 text-right" title="Пропущено">Пр</th>
          <th className="px-2 py-1.5 text-right" title="Разница">Р</th>
          <th className="px-2 py-1.5 text-right" title="Очки">О</th>
        </tr>
      </thead>
      <tbody>
        {section.standings.map((row) => (
          <tr key={row.teamId} className="border-t border-border/50">
            <td className="px-2 py-1.5 font-mono tabular-nums text-muted">{row.place}</td>
            <td className="px-2 py-1.5 font-medium">{row.teamName}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.played}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.wins}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.draws}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.losses}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.scoredFor}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.scoredAgainst}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.diff}</td>
            <td className="px-2 py-1.5 text-right font-mono font-semibold tabular-nums">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MatchScore({ match }: { match: BrainMatchDTO }) {
  const label =
    match.teamAName === "—" && match.teamBName === "—"
      ? "Команды не назначены"
      : `${match.teamAName} ${match.scoreA}:${match.scoreB} ${match.teamBName}`;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="truncate font-medium">{label}</span>
      {match.complete && (
        <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
          завершён
        </span>
      )}
    </div>
  );
}

function PlayoffAssignForm({
  matchId,
  teams,
  busy,
  onAction,
}: {
  matchId: string;
  teams: { id: string; name: string }[];
  busy: boolean;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const [teamAId, setTeamAId] = useState("tbd");
  const [teamBId, setTeamBId] = useState("tbd");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (teamAId === "tbd" || teamBId === "tbd") return;
    await onAction("set-playoff-teams", { matchId, teamAId, teamBId });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-amber-200 bg-white p-3"
    >
      <p className="mb-2 text-xs font-medium text-amber-900">
        Назначить команды на матч
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <select
          className="rounded border border-border px-2 py-1.5 text-xs"
          value={teamAId}
          onChange={(e) => setTeamAId(e.target.value)}
        >
          <option value="tbd">—</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">vs</span>
        <select
          className="rounded border border-border px-2 py-1.5 text-xs"
          value={teamBId}
          onChange={(e) => setTeamBId(e.target.value)}
        >
          <option value="tbd">—</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || teamAId === "tbd" || teamBId === "tbd"}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Сохранить
        </button>
      </div>
    </form>
  );
}

function ModeratorPanel({
  state,
  onAction,
  busy,
}: {
  state: BrainTournamentDTO;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const activeMatch = state.sections
    .flatMap((s) => s.matches)
    .find((m) => m.id === state.activeMatchId);

  const realTeams = state.teams.filter((t) => t.id !== "tbd");

  return (
    <div
      id="cmp-syreny-brain-moderator"
      className="mb-8 rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Settings2 className="h-4 w-4" />
        Панель модератора
      </div>

      {!state.initialized ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction("init")}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Создать турнир из списка команд
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction("advance-playoff")}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
            >
              Заполнить полуфиналы (1A vs 2B, 1B vs 2A)
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-amber-900">
              Текущий матч
            </label>
            <select
              className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
              value={state.activeMatchId ?? ""}
              onChange={(e) =>
                onAction("set-active-match", { matchId: e.target.value || null })
              }
              disabled={busy}
            >
              <option value="">— выберите матч —</option>
              {state.sections.map((sec) => (
                <optgroup key={sec.id} label={sec.name}>
                  {sec.matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.teamAName} — {m.teamBName} ({m.scoreA}:{m.scoreB})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {activeMatch && activeMatch.teamAId !== "tbd" && (
            <div>
              <p className="mb-2 text-xs text-amber-800">
                Взятия вопросов · {activeMatch.teamAName} vs {activeMatch.teamBName}
                {" · "}
                <strong>
                  {activeMatch.scoreA}:{activeMatch.scoreB}
                </strong>
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activeMatch.captures.map((cap, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white p-2"
                  >
                    <span className="w-6 shrink-0 text-center text-xs font-mono text-muted">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onAction("set-capture", {
                          matchId: activeMatch.id,
                          questionIndex: idx,
                          teamId: activeMatch.teamAId,
                        })
                      }
                      className={`flex-1 truncate rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                        cap === activeMatch.teamAId
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200"
                      }`}
                    >
                      {activeMatch.teamAName}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onAction("set-capture", {
                          matchId: activeMatch.id,
                          questionIndex: idx,
                          teamId: activeMatch.teamBId,
                        })
                      }
                      className={`flex-1 truncate rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                        cap === activeMatch.teamBId
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200"
                      }`}
                    >
                      {activeMatch.teamBName}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onAction("set-capture", {
                          matchId: activeMatch.id,
                          questionIndex: idx,
                          teamId: null,
                        })
                      }
                      className={`shrink-0 rounded px-1.5 py-1 text-[10px] font-medium ${
                        cap === null
                          ? "bg-zinc-500 text-white"
                          : cap === undefined
                            ? "bg-zinc-100 hover:bg-zinc-200 text-muted"
                            : "bg-zinc-100 hover:bg-zinc-200"
                      }`}
                      title="Никто"
                    >
                      —
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMatch && activeMatch.teamAId === "tbd" && (
            <PlayoffAssignForm
              key={activeMatch.id}
              matchId={activeMatch.id}
              teams={realTeams}
              busy={busy}
              onAction={onAction}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function BrainRingClient() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canModerate =
    role === "MODERATOR" || role === "ORGANIZER" || role === "ADMIN";

  const [state, setState] = useState<BrainTournamentDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/syreny-lite/brain-ring/events");
    es.onmessage = (ev) => {
      try {
        setState(JSON.parse(ev.data));
        setLoading(false);
      } catch {}
    };
    es.onerror = () => {
      fetch("/api/syreny-lite/brain-ring", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          setState(data);
          setLoading(false);
        })
        .catch(() => setError("Не удалось подключиться"));
    };
    return () => es.close();
  }, []);

  const doAction = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/syreny-lite/brain-ring/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Ошибка");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const groupSections = useMemo(
    () => state?.sections.filter((s) => GROUP_SECTIONS.has(s.id)) ?? [],
    [state],
  );
  const playoffSections = useMemo(
    () => state?.sections.filter((s) => !GROUP_SECTIONS.has(s.id)) ?? [],
    [state],
  );

  return (
    <div id="page-syreny-lite-brain-ring" className="mx-auto max-w-[min(100%,80rem)] px-4 py-10 sm:px-6">
      <Link
        href="/mazowieckie-syreny-lite"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Syrenki Mazowieckie Lite
      </Link>

      <div id="page-syreny-lite-brain-ring-header" className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Брейн-ринг
        </h1>
        <p className="mt-2 text-sm text-muted">
          Групповой этап и плей-офф · обновление в реальном времени
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {state && !loading && (
        <>
          {canModerate && (
            <ModeratorPanel state={state} onAction={doAction} busy={busy} />
          )}

          {!state.initialized && !canModerate && (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
              Турнир ещё не начат. Ожидайте объявления модератора.
            </div>
          )}

          {state.initialized && (
            <>
              <section id="page-syreny-lite-brain-ring-groups" className="mb-10">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
                  <Trophy className="h-5 w-5 text-accent" />
                  Групповой этап
                </h2>
                <div className="grid gap-4 lg:grid-cols-3">
                  {groupSections.map((section) => (
                    <div
                      key={section.id}
                      className="overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="border-b border-border bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        {section.name}
                      </div>
                      <StandingsTable section={section} />
                    </div>
                  ))}
                </div>
              </section>

              <section id="page-syreny-lite-brain-ring-playoff" className="mb-10">
                <h2 className="mb-4 text-lg font-bold tracking-tight">Плей-офф</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {playoffSections.map((section) => (
                    <div
                      key={section.id}
                      className="overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="border-b border-border bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
                        {section.name}
                        {section.matches[0] && (
                          <span className="ml-2 font-normal text-amber-700">
                            · {section.matches[0].questionCount} вопросов
                          </span>
                        )}
                      </div>
                      <div className="divide-y divide-border/50 p-3">
                        {section.matches.map((m) => (
                          <MatchScore key={m.id} match={m} />
                        ))}
                        {section.standings.length > 0 && section.standings[0].played > 0 && (
                          <div className="pt-2">
                            <StandingsTable section={section} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <details className="rounded-xl border border-border bg-surface">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                  Все матчи группового этапа
                </summary>
                <div className="divide-y divide-border/50 border-t border-border px-4">
                  {groupSections.flatMap((s) =>
                    s.matches.map((m) => (
                      <div key={m.id} className="py-2">
                        <MatchScore match={m} />
                      </div>
                    )),
                  )}
                </div>
              </details>
            </>
          )}

          {state.initialized && (
            <p className="mt-6 flex items-center gap-1.5 text-[10px] text-muted">
              <RefreshCw className="h-3 w-3" />
              Обновлено {new Date(state.updatedAt).toLocaleTimeString("ru-RU")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
