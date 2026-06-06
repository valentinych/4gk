"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Settings2,
  Shuffle,
  Trophy,
} from "lucide-react";
import type {
  BrainDrawReveal,
  BrainGroupAssignments,
  BrainMatchDTO,
  BrainSectionDTO,
  BrainTeam,
  BrainTournamentDTO,
} from "@/lib/syreny-lite-brain-store";
type GroupKey = "" | "groupA" | "groupB" | "outGroup";

function assignmentsToMap(
  teams: BrainTeam[],
  assignments: BrainGroupAssignments,
): Record<string, GroupKey> {
  const map: Record<string, GroupKey> = {};
  for (const t of teams) map[t.id] = "";
  for (const id of assignments.groupA) map[id] = "groupA";
  for (const id of assignments.groupB) map[id] = "groupB";
  for (const id of assignments.outGroup) map[id] = "outGroup";
  return map;
}

function mapToAssignments(map: Record<string, GroupKey>): BrainGroupAssignments {
  const groupA: string[] = [];
  const groupB: string[] = [];
  const outGroup: string[] = [];
  for (const [id, g] of Object.entries(map)) {
    if (g === "groupA") groupA.push(id);
    else if (g === "groupB") groupB.push(id);
    else if (g === "outGroup") outGroup.push(id);
  }
  return { groupA, groupB, outGroup };
}

const GROUP_SECTIONS = new Set(["group-a", "group-b", "out-group"]);

function matchOptionLabel(m: BrainMatchDTO): string {
  const score = ` (${m.scoreA}:${m.scoreB})`;
  if (GROUP_SECTIONS.has(m.sectionId) && m.playOrder > 0) {
    return `${m.playOrder}. ${m.teamAName} — ${m.teamBName}${score}`;
  }
  return `${m.teamAName} — ${m.teamBName}${score}`;
}

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
      : GROUP_SECTIONS.has(match.sectionId) && match.playOrder > 0
        ? `${match.playOrder}. ${match.teamAName} ${match.scoreA}:${match.scoreB} ${match.teamBName}`
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

function useDrawRevealProgress(drawReveal: BrainDrawReveal | null): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!drawReveal) {
      setProgress(0);
      return;
    }
    const update = () => {
      const n = Math.min(
        drawReveal.steps.length,
        Math.floor((Date.now() - drawReveal.startedAt) / drawReveal.stepMs),
      );
      setProgress(n);
    };
    update();
    const id = setInterval(update, 120);
    return () => clearInterval(id);
  }, [drawReveal]);

  return progress;
}

function revealedSlice(
  drawReveal: BrainDrawReveal,
  progress: number,
): BrainGroupAssignments {
  const out: BrainGroupAssignments = { groupA: [], groupB: [], outGroup: [] };
  for (let i = 0; i < progress; i++) {
    const step = drawReveal.steps[i];
    out[step.group].push(step.teamId);
  }
  return out;
}

function GroupSetupPreview({
  teams,
  assignments,
  drawReveal = null,
}: {
  teams: BrainTeam[];
  assignments: BrainGroupAssignments;
  drawReveal?: BrainDrawReveal | null;
}) {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const progress = useDrawRevealProgress(drawReveal);
  const animating =
    drawReveal !== null && progress < drawReveal.steps.length;
  const revealed = animating ? revealedSlice(drawReveal, progress) : assignments;

  const blocks: {
    title: string;
    key: keyof BrainGroupAssignments;
    ids: string[];
    rec: number;
  }[] = [
    { title: "Группа A", key: "groupA", ids: assignments.groupA, rec: 5 },
    { title: "Группа B", key: "groupB", ids: assignments.groupB, rec: 5 },
    { title: "Вне зачёта", key: "outGroup", ids: assignments.outGroup, rec: 4 },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {blocks.map((b) => {
        const shown = revealed[b.key];
        const hiddenCount = animating ? b.ids.length - shown.length : 0;
        return (
          <div
            key={b.title}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {b.title}
              <span className="ml-1 font-normal normal-case">
                ({b.ids.length}
                {b.rec > 0 ? ` / ${b.rec}` : ""})
              </span>
            </h3>
            {b.ids.length === 0 ? (
              <p className="text-xs text-muted">Пока пусто</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {shown.map((id) => (
                  <li key={id}>{name(id)}</li>
                ))}
                {hiddenCount > 0 &&
                  Array.from({ length: hiddenCount }).map((_, i) => (
                    <li
                      key={`hidden-${i}`}
                      className="font-mono text-muted"
                      aria-hidden
                    >
                      ?
                    </li>
                  ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GroupSetupForm({
  teams,
  assignments,
  drawReveal,
  busy,
  onAction,
}: {
  teams: BrainTeam[];
  assignments: BrainGroupAssignments;
  drawReveal: BrainDrawReveal | null;
  busy: boolean;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const [local, setLocal] = useState(() => assignmentsToMap(teams, assignments));
  const [drawPool, setDrawPool] = useState(() => new Set(teams.map((t) => t.id)));
  const drawProgress = useDrawRevealProgress(drawReveal);
  const drawAnimating =
    drawReveal !== null && drawProgress < drawReveal.steps.length;

  useEffect(() => {
    setLocal(assignmentsToMap(teams, assignments));
  }, [teams, assignments.groupA, assignments.groupB, assignments.outGroup]);

  useEffect(() => {
    setDrawPool(new Set(teams.map((t) => t.id)));
  }, [teams]);

  const current = mapToAssignments(local);
  const counts = {
    groupA: current.groupA.length,
    groupB: current.groupB.length,
    outGroup: current.outGroup.length,
  };

  async function setGroup(teamId: string, group: GroupKey) {
    const next = { ...local, [teamId]: group };
    setLocal(next);
    const payload = mapToAssignments(next);
    await onAction("set-groups", {
      groupA: payload.groupA,
      groupB: payload.groupB,
      outGroup: payload.outGroup,
    });
  }

  function toggleDrawPool(teamId: string) {
    setDrawPool((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-amber-800">
        Распределите команды вручную или проведите слепую жеребьёвку среди
        отмеченных. Рекомендуется: по 5 в A и B, до 4 вне зачёта.
      </p>
      <div className="overflow-hidden rounded-lg border border-amber-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-center" title="Участвует в жеребьёвке">
                Ж
              </th>
              <th className="px-3 py-2 text-left">Команда</th>
              <th className="px-3 py-2 text-left">Группа</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-t border-border/50">
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={drawPool.has(t.id)}
                    disabled={busy || drawAnimating}
                    onChange={() => toggleDrawPool(t.id)}
                    className="h-3.5 w-3.5 rounded border-border"
                    aria-label={`${t.name} в жеребьёвке`}
                  />
                </td>
                <td className="px-3 py-2">
                  <span className="font-medium">{t.name}</span>
                  {t.outOfCompetition && (
                    <span className="ml-2 text-[10px] text-muted">вне зачёта</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <select
                    className="w-full max-w-xs rounded border border-border px-2 py-1 text-xs"
                    value={local[t.id] ?? ""}
                    disabled={busy || drawAnimating}
                    onChange={(e) => setGroup(t.id, e.target.value as GroupKey)}
                  >
                    <option value="">— не участвует —</option>
                    <option value="groupA">Группа A ({counts.groupA}/5)</option>
                    <option value="groupB">Группа B ({counts.groupB}/5)</option>
                    <option value="outGroup">Вне зачёта ({counts.outGroup}/4)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GroupSetupPreview
        teams={teams}
        assignments={current}
        drawReveal={drawReveal}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || drawAnimating || drawPool.size === 0}
          onClick={() => onAction("draw-groups", { teamIds: [...drawPool] })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200 disabled:opacity-50"
        >
          <Shuffle className="h-4 w-4" />
          Слепая жеребьёвка
        </button>
        <button
          type="button"
          disabled={busy || drawAnimating}
          onClick={() => onAction("start")}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Начать турнир
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Отменить настройку и сбросить распределение?")) {
              onAction("reset");
            }
          }}
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
        >
          Отменить
        </button>
      </div>
    </div>
  );
}

function MatchCaptureGrid({
  match,
  busy,
  onAction,
}: {
  match: BrainMatchDTO;
  busy: boolean;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {match.captures.map((cap, idx) => (
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
                matchId: match.id,
                questionIndex: idx,
                teamId: match.teamAId,
              })
            }
            className={`flex-1 truncate rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
              cap === match.teamAId
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 hover:bg-zinc-200"
            }`}
          >
            {match.teamAName}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onAction("set-capture", {
                matchId: match.id,
                questionIndex: idx,
                teamId: match.teamBId,
              })
            }
            className={`flex-1 truncate rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
              cap === match.teamBId
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 hover:bg-zinc-200"
            }`}
          >
            {match.teamBName}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onAction("set-capture", {
                matchId: match.id,
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
  );
}

function SectionMatchPanel({
  section,
  realTeams,
  busy,
  onAction,
}: {
  section: BrainSectionDTO;
  realTeams: BrainTeam[];
  busy: boolean;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const activeMatch =
    section.matches.find((m) => m.id === section.activeMatchId) ?? null;

  return (
    <div className="rounded-lg border border-amber-200 bg-white/80 p-3">
      <label className="mb-1 block text-xs font-semibold text-amber-900">
        {section.name}
      </label>
      <select
        className="mb-3 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
        value={section.activeMatchId ?? ""}
        onChange={(e) =>
          onAction("set-section-active-match", {
            sectionId: section.id,
            matchId: e.target.value || null,
          })
        }
        disabled={busy || section.matches.length === 0}
      >
        <option value="">— выберите матч —</option>
        {section.matches.map((m) => (
          <option key={m.id} value={m.id}>
            {matchOptionLabel(m)}
          </option>
        ))}
      </select>

      {activeMatch && activeMatch.teamAId !== "tbd" && (
        <div>
          <p className="mb-2 text-xs text-amber-800">
            {activeMatch.teamAName} vs {activeMatch.teamBName}
            {" · "}
            <strong>
              {activeMatch.scoreA}:{activeMatch.scoreB}
            </strong>
          </p>
          <MatchCaptureGrid match={activeMatch} busy={busy} onAction={onAction} />
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
  const realTeams = state.teams.filter((t) => t.id !== "tbd");
  const groupSections = state.sections.filter((s) => GROUP_SECTIONS.has(s.id));
  const playoffSections = state.sections.filter((s) => !GROUP_SECTIONS.has(s.id));

  async function handleDelete() {
    if (
      window.confirm(
        "Удалить турнир по брейн-рингу? Все результаты будут потеряны.",
      )
    ) {
      await onAction("reset");
    }
  }

  return (
    <div
      id="cmp-syreny-brain-moderator"
      className="mb-8 rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Settings2 className="h-4 w-4" />
          Панель модератора
        </div>
        {(state.initialized || state.setup) && (
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Удалить турнир
          </button>
        )}
      </div>

      {!state.initialized && !state.setup ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction("prepare")}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Настроить турнир
        </button>
      ) : state.setup && !state.initialized ? (
        <GroupSetupForm
          teams={realTeams}
          assignments={state.groupAssignments}
          drawReveal={state.drawReveal}
          busy={busy}
          onAction={onAction}
        />
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

          <p className="text-xs text-amber-800">
            Три группы играют параллельно — у каждой свой текущий матч. Выбор
            матча в одной группе не меняет другие.
          </p>

          <div className="grid gap-3 lg:grid-cols-3">
            {groupSections.map((sec) => (
              <SectionMatchPanel
                key={sec.id}
                section={sec}
                realTeams={realTeams}
                busy={busy}
                onAction={onAction}
              />
            ))}
          </div>

          {playoffSections.some((s) => s.matches.length > 0) && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
                Плей-офф
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {playoffSections.map((sec) => (
                  <SectionMatchPanel
                    key={sec.id}
                    section={sec}
                    realTeams={realTeams}
                    busy={busy}
                    onAction={onAction}
                  />
                ))}
              </div>
            </div>
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

          {state.setup && !state.initialized && (
            <section id="page-syreny-lite-brain-ring-setup" className="mb-10">
              <h2 className="mb-4 text-lg font-bold tracking-tight">
                Распределение по группам
              </h2>
              <GroupSetupPreview
                teams={state.teams.filter((t) => t.id !== "tbd")}
                assignments={state.groupAssignments}
                drawReveal={state.drawReveal}
              />
            </section>
          )}

          {!state.initialized && !state.setup && !canModerate && (
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
