"use client";

import { Check, HelpCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

export type ControversialVerdict = "PENDING" | "ACCEPTED" | "REJECTED";

export type ControversialAdminRow = {
  id: string;
  questionNumber: number;
  answerText: string;
  status: ControversialVerdict;
  rationale: string | null;
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
}: {
  initialRows: ControversialAdminRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [showTeamNo, setShowTeamNo] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  async function patch(
    id: string,
    body: { status?: ControversialVerdict; rationale?: string },
  ): Promise<ControversialAdminRow | null> {
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
      return {
        id,
        questionNumber: 0,
        answerText: "",
        status: (data?.status as ControversialVerdict) ?? "PENDING",
        rationale: data?.rationale ?? null,
        teamNumber: null,
        decidedByName: data?.decidedByName ?? null,
      };
    } catch {
      setError("Не удалось сохранить");
      return null;
    } finally {
      setPendingId(null);
    }
  }

  async function onVerdict(row: ControversialAdminRow, status: ControversialVerdict) {
    if (row.status === status || pendingId) return;
    const updated = await patch(row.id, { status });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, status: updated.status, decidedByName: updated.decidedByName }
          : r,
      ),
    );
  }

  async function onSaveRationale(row: ControversialAdminRow) {
    if (pendingId) return;
    const rationale = drafts[row.id] ?? row.rationale ?? "";
    const updated = await patch(row.id, { rationale });
    if (!updated) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              rationale: updated.rationale,
              decidedByName: updated.decidedByName,
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

  return (
    <section id="page-ochch-controversial-admin" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Поданные спорные</h2>
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
        <p className="text-sm text-muted">Пока нет поданных спорных.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 text-left font-medium">Вопрос</th>
                <th className="px-3 py-2.5 text-left font-medium">Ответ</th>
                <th className="px-3 py-2.5 text-left font-medium">Вердикт</th>
                <th className="px-3 py-2.5 text-left font-medium">Аргументация</th>
                <th className="px-3 py-2.5 text-left font-medium">Решение</th>
                {showTeamNo ? (
                  <th className="px-3 py-2.5 text-left font-medium">№</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
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
                            disabled={pendingId === row.id}
                            onClick={() => onVerdict(row, value)}
                            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border ${
                              pressed ? activeClass : "text-muted/40"
                            } disabled:opacity-60`}
                          >
                            <Icon className="h-5 w-5" aria-hidden />
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="min-w-[12rem] px-3 py-2.5">
                    <textarea
                      aria-label="Аргументация"
                      rows={2}
                      value={drafts[row.id] ?? row.rationale ?? ""}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [row.id]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                    <button
                      type="button"
                      disabled={pendingId === row.id}
                      onClick={() => onSaveRationale(row)}
                      className="mt-1.5 inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                    >
                      Сохранить
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                    {row.decidedByName ?? ""}
                  </td>
                  {showTeamNo ? (
                    <td className="px-3 py-2.5 font-mono tabular-nums text-muted">
                      {row.teamNumber ?? "—"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
