"use client";

import { Check, HelpCircle, Lock, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export function OchchControversialVerdictMark({
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

export function OchchControversialAdminTable({
  initialRows,
  initialGraveyard,
  canGraveyard,
  leaders,
}: {
  initialRows: ControversialAdminRow[];
  initialGraveyard: ControversialAdminRow[];
  canGraveyard: boolean;
  leaders: {
    teamNumber: number | null;
    count: number;
    acceptedLocked: number;
    rejectedLocked: number;
  }[] | null;
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
      action?: "lock" | "trash";
    },
  ): Promise<(Partial<ControversialAdminRow> & { error?: string }) | null> {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch("/api/ochch/controversial", {
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

  async function onVerdict(row: ControversialAdminRow, status: ControversialVerdict) {
    if (row.locked || row.status === status || pendingId) return;
    const updated = await patch(row.id, { status });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              status: updated.status ?? r.status,
              decidedByName: updated.decidedByName ?? r.decidedByName,
            }
          : r,
      ),
    );
  }

  async function onSaveRationale(row: ControversialAdminRow) {
    if (row.locked || pendingId) return;
    const rationale = drafts[row.id] ?? row.rationale ?? "";
    const updated = await patch(row.id, { rationale });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              rationale: updated.rationale ?? r.rationale,
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

  async function onLock(row: ControversialAdminRow) {
    if (row.locked || pendingId || row.status === "PENDING") return;
    const updated = await patch(row.id, { action: "lock" });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, locked: true } : r)),
    );
    router.refresh();
  }

  async function onTrash(row: ControversialAdminRow) {
    if (pendingId) return;
    if (!window.confirm("На кладбище?")) return;
    const updated = await patch(row.id, { action: "trash" });
    if (!updated) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setGraveyard((prev) => [...prev, row]);
    setDrafts((d) => {
      if (!(row.id in d)) return d;
      const next = { ...d };
      delete next[row.id];
      return next;
    });
    router.refresh();
  }

  return (
    <>
    <section id="page-ochch-controversial-admin" className="space-y-3">
      <h2 className="text-lg font-bold">Поданные спорные</h2>
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Пока нет поданных спорных.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 text-left font-medium">Вопрос</th>
                <th className="px-3 py-2.5 text-left font-medium">Ответ</th>
                <th className="px-3 py-2.5 text-left font-medium">Вердикт</th>
                <th className="px-3 py-2.5 text-left font-medium">№ команды</th>
                <th className="px-3 py-2.5 text-left font-medium">Аргументация</th>
                <th className="px-3 py-2.5 text-left font-medium">Решение</th>
                {canGraveyard ? (
                  <th className="px-3 py-2.5 text-left font-medium">
                    <span className="sr-only">На кладбище</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const busy = pendingId === row.id;
                const verdictDisabled = row.locked || busy;
                const lockNeedsVerdict = !row.locked && row.status === "PENDING";
                const lockDisabled = row.locked || busy || lockNeedsVerdict;
                return (
                  <tr key={row.id}>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      {row.questionNumber}
                    </td>
                    <td className="px-3 py-2.5">{row.answerText}</td>
                    <td className="px-3 py-2.5">
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
                    <td
                      className="px-3 py-2.5 font-mono tabular-nums text-muted"
                      title={row.teamNumber === 0 ? "Админы" : undefined}
                    >
                      {row.teamNumber ?? "—"}
                    </td>
                    <td className="min-w-[12rem] px-3 py-2.5">
                      <textarea
                        aria-label="Аргументация"
                        rows={2}
                        disabled={row.locked}
                        readOnly={row.locked}
                        value={drafts[row.id] ?? row.rationale ?? ""}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [row.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
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
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                      {row.decidedByName ?? ""}
                    </td>
                    {canGraveyard ? (
                      <td className="px-3 py-2.5">
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
    {leaders ? (
      <details
        id="page-ochch-controversial-leaders"
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
      id="page-ochch-controversial-graveyard"
      className="rounded-xl border border-border bg-surface"
    >
      <summary className="cursor-pointer px-4 py-3 text-lg font-bold">
        Кладбище спорных
      </summary>
      <div className="border-t border-border px-4 py-3">
        {graveyard.length === 0 ? (
          <p className="text-sm text-muted">Пусто.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 text-left font-medium">Вопрос</th>
                  <th className="px-3 py-2.5 text-left font-medium">Ответ</th>
                  <th className="px-3 py-2.5 text-left font-medium">Вердикт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {graveyard.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      {row.questionNumber}
                    </td>
                    <td className="px-3 py-2.5">{row.answerText}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <OchchControversialVerdictMark status={row.status} />
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
    </>
  );
}
