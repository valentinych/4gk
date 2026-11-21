"use client";

import { Check, HelpCircle, Lock, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { FitTextarea } from "./FitTextarea";

export type ControversialVerdict = "PENDING" | "ACCEPTED" | "REJECTED";

export type ControversialAdminRow = {
  id: string;
  questionNumber: number;
  answerText: string;
  status: ControversialVerdict;
  rationale: string | null;
  locked: boolean;
  teamNumber: number | null;
  decidedByName: string | null;
};

const TABLE_WRAP =
  "max-md:overflow-visible rounded-xl border border-border bg-surface md:overflow-x-auto";
const TABLE =
  "w-full text-sm max-md:block md:min-w-[36rem]";
const TABLE_BODY = "max-md:block";
const DATA_ROW =
  "hover:bg-surface/50 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-2 max-md:px-3 max-md:py-2.5";
const CELL = "px-3 py-2.5 max-md:block max-md:max-w-full max-md:min-w-0 max-md:p-0";

const VERDICT_BUTTONS: {
  value: ControversialVerdict;
  label: string;
  Icon: typeof Check;
  activeClass: string;
}[] = [
  {
    value: "ACCEPTED",
    label: "принят",
    Icon: Check,
    activeClass: "text-emerald-600",
  },
  {
    value: "REJECTED",
    label: "отклонён",
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

export function OchbControversialVerdictMark({
  status,
}: {
  status: ControversialVerdict;
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

export function OchbControversialAdminTable({
  initialRows,
  initialGraveyard,
  canGraveyard,
  canUnlock,
  leaders,
  questionRange = null,
}: {
  initialRows: ControversialAdminRow[];
  initialGraveyard: ControversialAdminRow[];
  canGraveyard: boolean;
  canUnlock: boolean;
  leaders: {
    teamNumber: number | null;
    count: number;
    acceptedLocked: number;
    rejectedLocked: number;
  }[] | null;
  questionRange?: { from: number; to: number } | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [graveyard, setGraveyard] = useState(initialGraveyard);
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
      status?: ControversialVerdict;
      rationale?: string;
      action?: "lock" | "trash" | "unlock";
    },
  ): Promise<(Partial<ControversialAdminRow> & { error?: string }) | null> {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch("/api/ochb/controversial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = (await res.json().catch(() => null)) as
        | (Partial<ControversialAdminRow> & { error?: string })
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

  function draftRationale(row: ControversialAdminRow) {
    return drafts[row.id] ?? row.rationale ?? "";
  }

  function clearDraft(id: string) {
    setDrafts((d) => {
      if (!(id in d)) return d;
      const next = { ...d };
      delete next[id];
      return next;
    });
  }

  async function onVerdict(row: ControversialAdminRow, status: ControversialVerdict) {
    if (row.locked || row.status === status || pendingId) return;
    const rationale = draftRationale(row);
    const updated = await patch(row.id, { status, rationale });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              status: updated.status ?? r.status,
              rationale:
                updated.rationale !== undefined ? updated.rationale : r.rationale,
              decidedByName: updated.decidedByName ?? r.decidedByName,
            }
          : r,
      ),
    );
    clearDraft(row.id);
  }

  async function onSaveRationale(row: ControversialAdminRow) {
    if (row.locked || pendingId) return;
    const rationale = draftRationale(row);
    const updated = await patch(row.id, { rationale });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              rationale:
                updated.rationale !== undefined ? updated.rationale : r.rationale,
              decidedByName: updated.decidedByName ?? r.decidedByName,
            }
          : r,
      ),
    );
    clearDraft(row.id);
  }

  async function onLock(row: ControversialAdminRow) {
    if (row.locked || pendingId || row.status === "PENDING") return;
    const rationale = draftRationale(row);
    const updated = await patch(row.id, { action: "lock", rationale });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              locked: true,
              rationale:
                updated.rationale !== undefined ? updated.rationale : r.rationale,
            }
          : r,
      ),
    );
    clearDraft(row.id);
    router.refresh();
  }

  async function onUnlock(
    row: ControversialAdminRow,
    where: "rows" | "graveyard",
  ) {
    if (!canUnlock || !row.locked || pendingId) return;
    const updated = await patch(row.id, { action: "unlock" });
    if (!updated) return;
    if (where === "graveyard") {
      const returned: ControversialAdminRow = {
        ...row,
        locked: false,
        status: updated.status ?? "PENDING",
        rationale:
          updated.rationale !== undefined ? updated.rationale : row.rationale,
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

  async function onTrash(row: ControversialAdminRow) {
    if (pendingId) return;
    if (!window.confirm("На кладбище?")) return;
    const rationale = draftRationale(row);
    const updated = await patch(row.id, { action: "trash", rationale });
    if (!updated) return;
    const remaining = rows.filter((r) => r.id !== row.id);
    setRows(remaining);
    setGraveyard((prev) => [
      ...prev,
      {
        ...row,
        rationale:
          updated.rationale !== undefined ? updated.rationale : row.rationale,
      },
    ]);
    clearDraft(row.id);
    router.refresh();
  }

  return (
    <>
    <section id="page-ochb-controversial-admin" className="space-y-3">
      <h2 className="text-lg font-bold">Поданные спорные</h2>
      {questionRange ? (
        <p className="text-sm text-muted">
          Вопросы вашего тура: {questionRange.from}–{questionRange.to}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Пока нет поданных спорных.</p>
      ) : (
        <div className={TABLE_WRAP}>
          <table className={TABLE}>
            <thead className="max-md:hidden">
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 text-left font-medium">Вопрос</th>
                <th className="px-3 py-2.5 text-left font-medium">Ответ</th>
                <th className="px-3 py-2.5 text-left font-medium">Вердикт</th>
                <th className="px-3 py-2.5 text-left font-medium">№ команды</th>
                <th className="px-3 py-2.5 text-left font-medium">Решение</th>
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
                return (
                  <Fragment key={row.id}>
                    <tr className={DATA_ROW}>
                      <td className={`${CELL} font-mono tabular-nums`}>
                        {row.questionNumber}
                      </td>
                      <td className={`${CELL} break-words`}>{row.answerText}</td>
                      <td className={`${CELL} max-md:shrink-0`}>
                        <div role="group" aria-label="Вердикт" className="flex gap-1">
                          {VERDICT_BUTTONS.map(({ value, label, Icon, activeClass }) => {
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
                          })}
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
                      <td
                        className={`${CELL} font-mono tabular-nums text-muted`}
                        title={row.teamNumber === 0 ? "Админы" : undefined}
                      >
                        {row.teamNumber ?? "—"}
                      </td>
                      <td className={`${CELL} text-muted md:whitespace-nowrap`}>
                        {row.decidedByName ?? ""}
                      </td>
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
                        colSpan={canGraveyard ? 6 : 5}
                        className={`px-3 pb-3 pt-1 max-md:block max-md:w-full ${
                          index < rows.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div
                          id={`page-ochb-controversial-comment-${row.id}`}
                          className="w-full max-w-none"
                        >
                          <FitTextarea
                            id={`ochb-controversial-comment-${row.id}`}
                            label="Аргументация"
                            value={drafts[row.id] ?? row.rationale ?? ""}
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
        id="page-ochb-controversial-leaders"
        className="rounded-xl border border-border bg-surface"
      >
        <summary className="cursor-pointer px-4 py-3 text-lg font-bold">
          Лидеры по спорным
        </summary>
        <div className="border-t border-border px-4 py-3">
          {leaders.length === 0 ? (
            <p className="text-sm text-muted">Пока нет поданных спорных.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted">
                    <th className="px-3 py-2.5 text-left font-medium">№ команды</th>
                    <th className="px-3 py-2.5 text-left font-medium">Подано</th>
                    <th className="px-3 py-2.5 text-left font-medium">
                      <span className="inline-flex text-emerald-600" title="принят">
                        <Check className="h-5 w-5" aria-hidden />
                        <span className="sr-only">принят</span>
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">
                      <span className="inline-flex text-red-600" title="отклонён">
                        <X className="h-5 w-5" aria-hidden />
                        <span className="sr-only">отклонён</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaders.map((row, index) => (
                    <tr key={`${row.teamNumber ?? "none"}-${index}`}>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {row.teamNumber ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">{row.count}</td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {row.acceptedLocked}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {row.rejectedLocked}
                      </td>
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
      id="page-ochb-controversial-graveyard"
      className="rounded-xl border border-border bg-surface"
    >
      <summary className="cursor-pointer px-4 py-3 text-lg font-bold">
        Кладбище спорных
      </summary>
      <div className="border-t border-border px-4 py-3">
        {graveyard.length === 0 ? (
          <p className="text-sm text-muted">Пусто.</p>
        ) : (
          <div className="max-md:overflow-visible md:overflow-x-auto">
            <table className="w-full text-sm max-md:block md:min-w-[24rem]">
              <thead className="max-md:hidden">
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 text-left font-medium">Вопрос</th>
                  <th className="px-3 py-2.5 text-left font-medium">Ответ</th>
                  <th className="px-3 py-2.5 text-left font-medium">№ команды</th>
                  <th className="px-3 py-2.5 text-left font-medium">Вердикт</th>
                </tr>
              </thead>
              <tbody id="page-ochb-controversial-graveyard-comments" className={TABLE_BODY}>
                {graveyard.map((row, index) => {
                  const busy = pendingId === row.id;
                  const unlockable = canUnlock && row.locked;
                  return (
                  <Fragment key={row.id}>
                  <tr className={DATA_ROW}>
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
                        <OchbControversialVerdictMark status={row.status} />
                        {unlockable ? (
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
                  </tr>
                  <tr className="max-md:block">
                    <td
                      colSpan={4}
                      className={`px-3 pb-3 pt-1 max-md:block max-md:w-full ${
                        index < graveyard.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <p className="text-xs font-medium uppercase tracking-wider text-muted">
                        Аргументация
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5">
                        {row.rationale?.trim() ? row.rationale : "—"}
                      </p>
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
