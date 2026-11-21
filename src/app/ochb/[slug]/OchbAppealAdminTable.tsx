"use client";

import { Check, HelpCircle, Lock, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { FitTextarea } from "./FitTextarea";

type AppealKind = "REMOVE" | "CREDIT";
type AppealVerdict = "PENDING" | "ACCEPTED" | "REJECTED";

const KIND_LABELS: Record<AppealKind, string> = {
  REMOVE: "На снятие",
  CREDIT: "На зачёт",
};

const ADMIN_RATIONALE_REQUIRED =
  "Для принятия или отклонения апелляции заполните обоснование жюри";

const TABLE_WRAP =
  "max-md:overflow-visible rounded-xl border border-border bg-surface md:overflow-x-auto";
const TABLE = "w-full text-sm max-md:block md:min-w-[32rem]";
const TABLE_BODY = "max-md:block";
const DATA_ROW =
  "hover:bg-surface/50 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-2 max-md:px-3 max-md:py-2.5";
const CELL = "px-3 py-2.5 max-md:block max-md:max-w-full max-md:min-w-0 max-md:p-0";

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

export function OchbAppealVerdictMark({
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

export function OchbAppealAdminTable({
  initialRows,
  initialGraveyard,
  canGraveyard,
  canUnlock,
  leaders,
}: {
  initialRows: AppealAdminRow[];
  initialGraveyard: AppealAdminRow[];
  canGraveyard: boolean;
  canUnlock: boolean;
  leaders: { teamNumber: number | null; count: number }[] | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [graveyard, setGraveyard] = useState(initialGraveyard);
  const [showTeamNo, setShowTeamNo] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
    setGraveyard(initialGraveyard);
  }, [initialRows, initialGraveyard]);

  async function patch(
    id: string,
    body: {
      status?: AppealVerdict;
      adminRationale?: string;
      action?: "lock" | "trash" | "hardDelete" | "unlock";
    },
    method: "PATCH" | "DELETE" = "PATCH",
  ): Promise<(Partial<AppealAdminRow> & { error?: string }) | null> {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch("/api/ochb/appeals", {
        method,
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
              adminRationale:
                updated.adminRationale !== undefined
                  ? updated.adminRationale
                  : r.adminRationale,
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
              adminRationale:
                updated.adminRationale !== undefined
                  ? updated.adminRationale
                  : r.adminRationale,
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

  function draftRationale(row: AppealAdminRow) {
    return drafts[row.id] ?? row.adminRationale ?? "";
  }

  function clearDraft(id: string) {
    setDrafts((d) => {
      if (!(id in d)) return d;
      const next = { ...d };
      delete next[id];
      return next;
    });
  }

  async function onLock(row: AppealAdminRow) {
    if (row.locked || pendingId || row.status === "PENDING") return;
    const adminRationale = draftRationale(row);
    if (needsJuryRationale(row.status) && !adminRationale.trim()) {
      setError(ADMIN_RATIONALE_REQUIRED);
      return;
    }
    const updated = await patch(row.id, { action: "lock", adminRationale });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              locked: true,
              adminRationale:
                updated.adminRationale !== undefined
                  ? updated.adminRationale
                  : r.adminRationale,
            }
          : r,
      ),
    );
    clearDraft(row.id);
    router.refresh();
  }

  async function onUnlock(row: AppealAdminRow, where: "rows" | "graveyard") {
    if (!canUnlock || !row.locked || pendingId) return;
    const updated = await patch(row.id, { action: "unlock" });
    if (!updated) return;
    if (where === "graveyard") {
      const returned: AppealAdminRow = {
        ...row,
        locked: false,
        status: updated.status ?? "PENDING",
        adminRationale:
          updated.adminRationale !== undefined
            ? updated.adminRationale
            : row.adminRationale,
        decidedByName: null,
      };
      setGraveyard((prev) => prev.filter((r) => r.id !== row.id));
      setRows((prev) => [...prev.filter((r) => r.id !== row.id), returned]);
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, locked: false } : r)),
      );
    }
    router.refresh();
  }

  async function onTrash(row: AppealAdminRow) {
    if (pendingId) return;
    if (!window.confirm("На кладбище?")) return;
    const adminRationale = draftRationale(row);
    if (needsJuryRationale(row.status) && !adminRationale.trim()) {
      setError(ADMIN_RATIONALE_REQUIRED);
      return;
    }
    const updated = await patch(row.id, { action: "trash", adminRationale });
    if (!updated) return;
    const remaining = rows.filter((r) => r.id !== row.id);
    setRows(remaining);
    setGraveyard((prev) => [
      ...prev,
      {
        ...row,
        adminRationale:
          updated.adminRationale !== undefined
            ? updated.adminRationale
            : row.adminRationale,
      },
    ]);
    clearDraft(row.id);
    router.refresh();
  }

  async function onHardDelete(row: AppealAdminRow) {
    if (pendingId) return;
    if (!window.confirm("Удалить навсегда?")) return;
    const updated = await patch(row.id, { action: "hardDelete" }, "DELETE");
    if (!updated) return;
    setGraveyard((prev) => prev.filter((r) => r.id !== row.id));
    router.refresh();
  }

  return (
    <>
    <section id="page-ochb-appeals-admin" className="space-y-3">
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
        <div className={TABLE_WRAP}>
            <table className={TABLE}>
              <thead className="max-md:hidden">
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 text-left font-medium">Вид</th>
                  <th className="px-3 py-2.5 text-left font-medium">Вопрос</th>
                  <th className="px-3 py-2.5 text-left font-medium">Ответ</th>
                  <th className="px-3 py-2.5 text-left font-medium">Вердикт</th>
                  <th className="px-3 py-2.5 text-left font-medium">Решение</th>
                  {showTeamNo ? (
                    <th className="px-3 py-2.5 text-left font-medium">№</th>
                  ) : null}
                  {canGraveyard ? (
                    <th className="px-3 py-2.5 text-left font-medium">
                      <span className="sr-only">На кладбище</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className={TABLE_BODY}>
                {rows.map((row, index) => {
                  const busy = pendingId === row.id;
                  const verdictDisabled = row.locked || busy;
                  const lockNeedsVerdict = !row.locked && row.status === "PENDING";
                  const unlockable = canUnlock && row.locked;
                  const lockDisabled = unlockable
                    ? busy
                    : row.locked || busy || lockNeedsVerdict;
                  const columnCount =
                    5 + (showTeamNo ? 1 : 0) + (canGraveyard ? 1 : 0);
                  return (
                    <Fragment key={row.id}>
                    <tr className={DATA_ROW}>
                      <td className={`${CELL} md:whitespace-nowrap`}>
                        {KIND_LABELS[row.kind]}
                      </td>
                      <td className={`${CELL} font-mono tabular-nums`}>
                        {row.questionNumber}
                      </td>
                      <td className={`${CELL} break-words`}>{row.answerText}</td>
                      <td className={`${CELL} max-md:shrink-0`}>
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
                              unlockable
                                ? "Снять замок"
                                : row.locked
                                  ? "Решение зафиксировано"
                                  : lockNeedsVerdict
                                    ? "Сначала выберите вердикт"
                                    : "Заблокировать решение"
                            }
                            title={
                              unlockable
                                ? "Снять замок"
                                : lockNeedsVerdict
                                  ? "Сначала выберите вердикт"
                                  : undefined
                            }
                            aria-pressed={row.locked}
                            aria-disabled={lockDisabled}
                            disabled={lockDisabled}
                            onClick={() =>
                              unlockable ? onUnlock(row, "rows") : onLock(row)
                            }
                            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border ${
                              row.locked
                                ? unlockable
                                  ? "text-red-600 hover:bg-red-50 disabled:opacity-60"
                                  : "cursor-default text-red-600 disabled:opacity-100"
                                : "text-muted disabled:opacity-60"
                            }`}
                          >
                            <Lock className="h-5 w-5" aria-hidden />
                          </button>
                        </div>
                      </td>
                      <td className={`${CELL} text-muted md:whitespace-nowrap`}>
                        {row.decidedByName ?? ""}
                      </td>
                      {showTeamNo ? (
                        <td
                          className={`${CELL} font-mono tabular-nums text-muted`}
                          title={row.teamNumber === 0 ? "Админы" : undefined}
                        >
                          {row.teamNumber ?? "—"}
                        </td>
                      ) : null}
                      {canGraveyard ? (
                        <td className={`${CELL} max-md:shrink-0`}>
                          <button
                            type="button"
                            aria-label="На кладбище"
                            disabled={busy}
                            onClick={() => onTrash(row)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground disabled:opacity-60"
                          >
                            <Trash2 className="h-5 w-5" aria-hidden />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                    <tr className="max-md:block">
                      <td
                        colSpan={columnCount}
                        className={`space-y-3 px-3 pb-3 pt-1 max-md:block max-md:w-full ${
                          index < rows.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted">
                            Аргументация
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5">
                            {row.argumentation?.trim() ? row.argumentation : "—"}
                          </p>
                        </div>
                        <div id={`page-ochb-appeals-comment-${row.id}`}>
                          <FitTextarea
                            id={`ochb-appeal-admin-rationale-${row.id}`}
                            label="Обоснование жюри"
                            value={drafts[row.id] ?? row.adminRationale ?? ""}
                            disabled={row.locked}
                            onChange={(value) =>
                              setDrafts((d) => ({ ...d, [row.id]: value }))
                            }
                          />
                          {row.locked ? null : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onSaveRationale(row)}
                              className="mt-1.5 inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                            >
                              Сохранить
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
        </div>
      )}
    </section>
    {leaders ? (
      <details
        id="page-ochb-appeals-leaders"
        className="rounded-xl border border-border bg-surface"
      >
        <summary className="cursor-pointer px-4 py-3 text-lg font-bold">
          Лидеры по апелляциям
        </summary>
        <div className="border-t border-border px-4 py-3">
          {leaders.length === 0 ? (
            <p className="text-sm text-muted">Пока нет поданных апелляций.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted">
                    <th className="px-3 py-2.5 text-left font-medium">№ команды</th>
                    <th className="px-3 py-2.5 text-left font-medium">Подано</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaders.map((row, index) => (
                    <tr key={`${row.teamNumber ?? "none"}-${index}`}>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {row.teamNumber ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>
    ) : null}
    <details
      id="page-ochb-appeals-graveyard"
      className="rounded-xl border border-border bg-surface"
    >
      <summary className="cursor-pointer px-4 py-3 text-lg font-bold">
        Кладбище апелляций
      </summary>
      <div className="border-t border-border px-4 py-3">
        {graveyard.length === 0 ? (
          <p className="text-sm text-muted">Пусто.</p>
        ) : (
          <div className="max-md:overflow-visible md:overflow-x-auto">
            <table className="w-full text-sm max-md:block md:min-w-[24rem]">
              <thead className="max-md:hidden">
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 text-left font-medium">Вид</th>
                  <th className="px-3 py-2.5 text-left font-medium">Вопрос</th>
                  <th className="px-3 py-2.5 text-left font-medium">Ответ</th>
                  <th className="px-3 py-2.5 text-left font-medium">№ команды</th>
                  <th className="px-3 py-2.5 text-left font-medium">Вердикт</th>
                  {canGraveyard ? (
                    <th className="px-3 py-2.5 text-left font-medium">
                      <span className="sr-only">Удалить</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody id="page-ochb-appeals-graveyard-comments" className={TABLE_BODY}>
                {graveyard.map((row, index) => {
                  const busy = pendingId === row.id;
                  const columnCount = 5 + (canGraveyard ? 1 : 0);
                  return (
                    <Fragment key={row.id}>
                    <tr className={DATA_ROW}>
                      <td className={`${CELL} md:whitespace-nowrap`}>
                        {KIND_LABELS[row.kind]}
                      </td>
                      <td className={`${CELL} font-mono tabular-nums`}>
                        {row.questionNumber}
                      </td>
                      <td className={`${CELL} break-words`}>{row.answerText}</td>
                      <td
                        className={`${CELL} font-mono tabular-nums text-muted`}
                        title={row.teamNumber === 0 ? "Админы" : undefined}
                      >
                        {row.teamNumber ?? "—"}
                      </td>
                      <td className={`${CELL} max-md:shrink-0`}>
                        <div className="flex items-center gap-1">
                          <OchbAppealVerdictMark status={row.status} />
                          {canUnlock && row.locked ? (
                            <button
                              type="button"
                              aria-label="Снять замок"
                              title="Снять замок"
                              disabled={busy}
                              onClick={() => onUnlock(row, "graveyard")}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              <Lock className="h-5 w-5" aria-hidden />
                            </button>
                          ) : (
                            <span
                              className={
                                row.locked ? "text-red-600" : "text-muted/40"
                              }
                              title={
                                row.locked
                                  ? "Решение зафиксировано"
                                  : "Решение не зафиксировано"
                              }
                              aria-label={
                                row.locked
                                  ? "Решение зафиксировано"
                                  : "Решение не зафиксировано"
                              }
                            >
                              <Lock className="h-5 w-5" aria-hidden />
                            </span>
                          )}
                        </div>
                      </td>
                      {canGraveyard ? (
                        <td className={`${CELL} max-md:shrink-0`}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onHardDelete(row)}
                            className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-3 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-60"
                          >
                            Удалить навсегда
                          </button>
                        </td>
                      ) : null}
                    </tr>
                    <tr className="max-md:block">
                      <td
                        colSpan={columnCount}
                        className={`space-y-2 px-3 pb-3 pt-1 max-md:block max-md:w-full ${
                          index < graveyard.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted">
                            Аргументация
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5">
                            {row.argumentation?.trim() ? row.argumentation : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted">
                            Обоснование жюри
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5">
                            {row.adminRationale?.trim() ? row.adminRationale : "—"}
                          </p>
                        </div>
                      </td>
                    </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
    </>
  );
}
