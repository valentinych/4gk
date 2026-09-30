"use client";

import { Check, HelpCircle, Lock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AppealKind = "REMOVE" | "CREDIT";
type AppealVerdict = "PENDING" | "ACCEPTED" | "REJECTED";

const KIND_LABELS: Record<AppealKind, string> = {
  REMOVE: "На снятие",
  CREDIT: "На зачёт",
};

const ADMIN_RATIONALE_REQUIRED =
  "Для принятия или отклонения апелляции заполните обоснование жюри";

export type AppealAdminRow = {
  id: string;
  kind: AppealKind;
  questionNumber: number;
  answerText: string;
  argumentation: string;
  status: AppealVerdict;
  adminRationale: string | null;
  locked: boolean;
  teamNumber: number | null;
  decidedByName: string | null;
};

const VERDICT_BUTTONS: {
  value: AppealVerdict;
  label: string;
  Icon: typeof Check;
  activeClass: string;
}[] = [
  {
    value: "ACCEPTED",
    label: "принята",
    Icon: Check,
    activeClass: "text-emerald-600",
  },
  {
    value: "REJECTED",
    label: "отклонена",
    Icon: X,
    activeClass: "text-red-600",
  },
  {
    value: "PENDING",
    label: "на рассмотрении",
    Icon: HelpCircle,
    activeClass: "text-amber-500",
  },
];

function needsJuryRationale(status: AppealVerdict): boolean {
  return status === "ACCEPTED" || status === "REJECTED";
}

export function OchchAppealVerdictMark({
  status,
}: {
  status: AppealVerdict;
}) {
  const active = VERDICT_BUTTONS.find((b) => b.value === status) ?? VERDICT_BUTTONS[2];
  const Icon = active.Icon;
  return (
    <span
      className={`inline-flex ${active.activeClass}`}
      title={active.label}
      aria-label={active.label}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

export function OchchAppealAdminTable({
  initialRows,
}: {
  initialRows: AppealAdminRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRows[0]?.id ?? null,
  );
  const [showTeamNo, setShowTeamNo] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
    setSelectedId((prev) =>
      prev && initialRows.some((r) => r.id === prev)
        ? prev
        : (initialRows[0]?.id ?? null),
    );
  }, [initialRows]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  async function patch(
    id: string,
    body: { status?: AppealVerdict; adminRationale?: string; action?: "lock" },
  ): Promise<(Partial<AppealAdminRow> & { error?: string }) | null> {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch("/api/ochch/appeals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = (await res.json().catch(() => null)) as
        | (Partial<AppealAdminRow> & { error?: string })
        | null;
      if (!res.ok) {
        setError(data?.error || "Не удалось сохранить");
        return null;
      }
      return data;
    } catch {
      setError("Не удалось сохранить");
      return null;
    } finally {
      setPendingId(null);
    }
  }

  async function onVerdict(row: AppealAdminRow, status: AppealVerdict) {
    if (row.locked || row.status === status || pendingId) return;
    const adminRationale = drafts[row.id] ?? row.adminRationale ?? "";
    if (needsJuryRationale(status) && !adminRationale.trim()) {
      setError(ADMIN_RATIONALE_REQUIRED);
      return;
    }
    const updated = await patch(row.id, { status, adminRationale });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              status: updated.status ?? r.status,
              adminRationale: updated.adminRationale ?? r.adminRationale,
              decidedByName: updated.decidedByName ?? r.decidedByName,
            }
          : r,
      ),
    );
  }

  async function onSaveRationale(row: AppealAdminRow) {
    if (row.locked || pendingId) return;
    const adminRationale = drafts[row.id] ?? row.adminRationale ?? "";
    if (needsJuryRationale(row.status) && !adminRationale.trim()) {
      setError(ADMIN_RATIONALE_REQUIRED);
      return;
    }
    const updated = await patch(row.id, { adminRationale });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              adminRationale: updated.adminRationale ?? r.adminRationale,
              decidedByName: updated.decidedByName ?? r.decidedByName,
            }
          : r,
      ),
    );
    setDrafts((d) => {
      const next = { ...d };
      delete next[row.id];
      return next;
    });
  }

  async function onLock(row: AppealAdminRow) {
    if (row.locked || pendingId || row.status === "PENDING") return;
    const updated = await patch(row.id, { action: "lock" });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, locked: true } : r)),
    );
    router.refresh();
  }

  return (
    <section id="page-ochch-appeals-admin" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Поданные апелляции</h2>
        <button
          type="button"
          aria-pressed={showTeamNo}
          onClick={() => setShowTeamNo((v) => !v)}
          className="text-xs text-muted hover:text-foreground"
        >
          {showTeamNo ? "Скрыть №" : "Показать №"}
        </button>
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Пока нет поданных апелляций.</p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 text-left font-medium">Вид</th>
                  <th className="px-3 py-2.5 text-left font-medium">Вопрос</th>
                  <th className="px-3 py-2.5 text-left font-medium">Ответ</th>
                  <th className="px-3 py-2.5 text-left font-medium">Вердикт</th>
                  <th className="px-3 py-2.5 text-left font-medium">Решение</th>
                  {showTeamNo ? (
                    <th className="px-3 py-2.5 text-left font-medium">№</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const busy = pendingId === row.id;
                  const isSelected = row.id === selectedId;
                  const verdictDisabled = row.locked || busy;
                  const lockNeedsVerdict = !row.locked && row.status === "PENDING";
                  const lockDisabled = row.locked || busy || lockNeedsVerdict;
                  return (
                    <tr
                      key={row.id}
                      aria-selected={isSelected}
                      onClick={() => setSelectedId(row.id)}
                      onFocusCapture={() => setSelectedId(row.id)}
                      className={`cursor-pointer ${
                        isSelected ? "bg-accent/10" : "hover:bg-surface/50"
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {KIND_LABELS[row.kind]}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {row.questionNumber}
                      </td>
                      <td className="px-3 py-2.5">{row.answerText}</td>
                      <td className="px-3 py-2.5">
                        <div role="group" aria-label="Вердикт" className="flex gap-1">
                          {VERDICT_BUTTONS.map(
                            ({ value, label, Icon, activeClass }) => {
                              const pressed = row.status === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  aria-pressed={pressed}
                                  aria-label={label}
                                  aria-disabled={verdictDisabled}
                                  disabled={verdictDisabled}
                                  onClick={() => onVerdict(row, value)}
                                  className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border ${
                                    pressed ? activeClass : "text-muted/40"
                                  } disabled:opacity-60`}
                                >
                                  <Icon className="h-5 w-5" aria-hidden />
                                </button>
                              );
                            },
                          )}
                          <button
                            type="button"
                            aria-label={
                              row.locked
                                ? "Решение зафиксировано"
                                : lockNeedsVerdict
                                  ? "Сначала выберите вердикт"
                                  : "Заблокировать решение"
                            }
                            title={
                              lockNeedsVerdict
                                ? "Сначала выберите вердикт"
                                : undefined
                            }
                            aria-pressed={row.locked}
                            aria-disabled={lockDisabled}
                            disabled={lockDisabled}
                            onClick={() => onLock(row)}
                            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border ${
                              row.locked
                                ? "cursor-default text-red-600 disabled:opacity-100"
                                : "text-muted disabled:opacity-60"
                            }`}
                          >
                            <Lock className="h-5 w-5" aria-hidden />
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                        {row.decidedByName ?? ""}
                      </td>
                      {showTeamNo ? (
                        <td
                          className="px-3 py-2.5 font-mono tabular-nums text-muted"
                          title={row.teamNumber === 0 ? "Админы" : undefined}
                        >
                          {row.teamNumber ?? "—"}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selected ? (
            <div className="space-y-3">
              <div className="w-full rounded-xl border border-border bg-surface p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
                  Аргументация
                  <span className="ml-2 font-normal normal-case tracking-normal">
                    {KIND_LABELS[selected.kind]} · вопрос {selected.questionNumber}
                  </span>
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {selected.argumentation}
                </p>
              </div>
              <div className="w-full rounded-xl border border-border bg-surface p-4">
                <label
                  htmlFor="ochch-appeal-admin-rationale"
                  className="text-xs font-medium uppercase tracking-wider text-muted"
                >
                  Обоснование жюри
                </label>
                <textarea
                  id="ochch-appeal-admin-rationale"
                  aria-label="Обоснование жюри"
                  rows={6}
                  disabled={selected.locked}
                  readOnly={selected.locked}
                  value={drafts[selected.id] ?? selected.adminRationale ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [selected.id]: e.target.value }))
                  }
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
                />
                {selected.locked ? null : (
                  <button
                    type="button"
                    disabled={pendingId === selected.id}
                    onClick={() => onSaveRationale(selected)}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                  >
                    Сохранить
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
