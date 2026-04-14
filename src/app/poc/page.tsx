"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BarChart3, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import type { PocResult, PocCrossCell } from "@/lib/parsers/poc-calculator";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiResult = PocResult & { error?: string };

// ─── Cross-table helpers ──────────────────────────────────────────────────────

function getCell(
  crossTable: Record<string, PocCrossCell>,
  rowPlayer: string,
  colPlayer: string,
): { cell: PocCrossCell; rowIsA: boolean } | null {
  const key =
    rowPlayer < colPlayer
      ? `${rowPlayer}|||${colPlayer}`
      : `${colPlayer}|||${rowPlayer}`;
  const cell = crossTable[key];
  if (!cell) return null;
  const rowIsA = key.startsWith(rowPlayer + "|||");
  return { cell, rowIsA };
}

function cellWins(cell: PocCrossCell, rowIsA: boolean) {
  return rowIsA
    ? { row: cell.winsA, col: cell.winsB, draws: cell.draws }
    : { row: cell.winsB, col: cell.winsA, draws: cell.draws };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PocTable({ poc }: { poc: PocResult["poc"] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted">
            <th className="px-3 py-2 text-center w-8">#</th>
            <th className="px-3 py-2 text-left">Игрок</th>
            <th className="px-3 py-2 text-center" title="POC (Power-Ordered Classification)">POC</th>
            <th className="px-3 py-2 text-center" title="Strength of Schedule">SOS</th>
            <th className="px-3 py-2 text-center">В</th>
            <th className="px-3 py-2 text-center">Н</th>
            <th className="px-3 py-2 text-center">П</th>
            <th className="px-3 py-2 text-center">И</th>
          </tr>
        </thead>
        <tbody>
          {poc.map((row, idx) => (
            <tr
              key={row.name}
              className={
                "border-b border-border last:border-0 " +
                (idx % 2 === 0 ? "bg-white" : "bg-muted/10")
              }
            >
              <td className="px-3 py-2 text-center text-xs font-bold text-muted">{row.pos}</td>
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2 text-center font-bold text-accent">{row.poc}</td>
              <td className="px-3 py-2 text-center text-muted">{row.sos}</td>
              <td className="px-3 py-2 text-center text-green-600 font-medium">{row.w}</td>
              <td className="px-3 py-2 text-center text-amber-500 font-medium">{row.d}</td>
              <td className="px-3 py-2 text-center text-red-500 font-medium">{row.l}</td>
              <td className="px-3 py-2 text-center text-muted">{row.g}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TooltipCell {
  bouts: PocCrossCell["bouts"];
  rowIsA: boolean;
  rowName: string;
  colName: string;
  x: number;
  y: number;
}

function CrossTable({
  crossPlayers,
  crossTable,
}: {
  crossPlayers: string[];
  crossTable: Record<string, PocCrossCell>;
}) {
  const [tooltip, setTooltip] = useState<TooltipCell | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(
    (
      e: React.MouseEvent,
      rowPlayer: string,
      colPlayer: string,
      cell: PocCrossCell,
      rowIsA: boolean,
    ) => {
      if (!cell.total) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      setTooltip({
        bouts: cell.bouts,
        rowIsA,
        rowName: rowPlayer,
        colName: colPlayer,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top,
      });
    },
    [],
  );

  if (!crossPlayers.length) return null;

  const N = crossPlayers.length;
  const colW = Math.max(36, Math.min(60, Math.floor(520 / N)));

  return (
    <div
      ref={containerRef}
      className="relative overflow-x-auto rounded-xl border border-border bg-white"
      onMouseLeave={() => setTooltip(null)}
    >
      <table className="text-xs border-collapse" style={{ minWidth: N * colW + 200 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-muted/20 px-3 py-2 text-left text-xs font-semibold text-muted min-w-[160px] border-b border-r border-border">
              Игрок
            </th>
            {crossPlayers.map((name, j) => (
              <th
                key={name}
                className="px-1 py-2 text-center font-bold border-b border-border text-[10px]"
                style={{ width: colW, minWidth: colW }}
                title={name}
              >
                {j + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {crossPlayers.map((rowPlayer, i) => (
            <tr key={rowPlayer} className="border-b border-border last:border-0">
              <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium border-r border-border whitespace-nowrap">
                <span className="text-muted mr-1.5 font-bold">{i + 1}.</span>
                {rowPlayer}
              </td>
              {crossPlayers.map((colPlayer, j) => {
                if (i === j) {
                  return (
                    <td
                      key={colPlayer}
                      className="text-center bg-muted/20 select-none"
                      style={{ width: colW }}
                    >
                      —
                    </td>
                  );
                }

                const data = getCell(crossTable, rowPlayer, colPlayer);
                if (!data || !data.cell.total) {
                  return (
                    <td
                      key={colPlayer}
                      className="text-center text-muted/40 py-1.5"
                      style={{ width: colW }}
                    >
                      ·
                    </td>
                  );
                }

                const { row: rowW, col: colW2, draws } = cellWins(data.cell, data.rowIsA);
                const isRowWin = rowW > colW2;
                const isRowLoss = rowW < colW2;
                const isDraw = rowW === colW2;

                const bg = isRowWin
                  ? "bg-green-50 text-green-700"
                  : isRowLoss
                    ? "bg-red-50 text-red-600"
                    : isDraw && draws > 0
                      ? "bg-amber-50 text-amber-600"
                      : "text-muted";

                return (
                  <td
                    key={colPlayer}
                    className={`text-center font-semibold py-1.5 cursor-default transition-colors hover:brightness-95 ${bg}`}
                    style={{ width: colW }}
                    onMouseEnter={(e) =>
                      handleMouseEnter(e, rowPlayer, colPlayer, data.cell, data.rowIsA)
                    }
                  >
                    {rowW}:{colW2}
                    {draws > 0 && ` (${draws}н)`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tooltip */}
      {tooltip && tooltip.bouts.length > 0 && (
        <div
          className="absolute z-50 rounded-lg border border-border bg-white shadow-lg p-3 pointer-events-none text-xs"
          style={{
            left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 400) - 200),
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)",
            minWidth: 180,
          }}
        >
          <div className="font-semibold mb-1.5 text-center">
            {tooltip.rowName} vs {tooltip.colName}
          </div>
          <div className="space-y-0.5">
            {tooltip.bouts.map((b, idx) => {
              const sRow = tooltip.rowIsA ? b.scoreA : b.scoreB;
              const sCol = tooltip.rowIsA ? b.scoreB : b.scoreA;
              const isWin = sRow > sCol;
              const isLoss = sRow < sCol;
              return (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <span className="text-muted">{b.tourName}</span>
                  <span
                    className={`font-bold ${isWin ? "text-green-600" : isLoss ? "text-red-500" : "text-amber-500"}`}
                  >
                    {sRow}:{sCol}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

function PocCalculatorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputUrl, setInputUrl] = useState(searchParams.get("url") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(
    async (url: string) => {
      if (!url.trim()) return;
      setLoading(true);
      setError(null);
      setResult(null);

      const next = new URLSearchParams({ url: url.trim() });
      router.replace(`/poc?${next.toString()}`, { scroll: false });

      try {
        const res = await fetch(`/api/poc?${new URLSearchParams({ url: url.trim() })}`);
        const data = (await res.json()) as ApiResult;
        if (!res.ok || data.error) {
          setError(data.error ?? "Ошибка вычисления");
        } else {
          setResult(data);
        }
      } catch {
        setError("Не удалось выполнить запрос. Проверьте соединение.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // Auto-calculate if URL param is present on load
  useEffect(() => {
    const url = searchParams.get("url");
    if (url) {
      setInputUrl(url);
      void calculate(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void calculate(inputUrl);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <BarChart3 className="h-3.5 w-3.5" />
          Рейтинг
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Калькулятор POC
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed max-w-prose">
          Power-Ordered Classification — рейтинг с учётом силы соперников. Введите ссылку
          на Google Sheets с результатами боёв. Таблица должна быть открыта для чтения.
          Каждый лист — тур, группы боёв разделены пустыми строками; каждая строка группы:{" "}
          <code className="rounded bg-muted/20 px-1">Имя, Очки</code>.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-shadow"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputUrl.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {loading ? "Считаем…" : "Рассчитать"}
          </button>
        </div>

        {/* Example link */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <ExternalLink className="h-3 w-3" />
          <button
            type="button"
            className="hover:text-accent underline underline-offset-2 transition-colors"
            onClick={() => {
              const ex =
                "https://docs.google.com/spreadsheets/d/1HAwO5bSZPUL-ZPW-vmI1iVXXYMwzQ2Vi2qJcyrdaDco/edit";
              setInputUrl(ex);
              void calculate(ex);
            }}
          >
            Пример: Микроматчи ЧВ
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-6 w-48 rounded-md bg-muted/20 animate-pulse" />
          <div className="h-48 rounded-xl bg-muted/10 animate-pulse" />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-10">
          {result.poc.length === 0 ? (
            <div className="text-sm text-muted">
              Не найдено данных о матчах. Убедитесь, что таблица в правильном формате и открыта для чтения.
            </div>
          ) : (
            <>
              {/* POC Rating */}
              <section>
                <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  Рейтинг POC
                </h2>
                <PocTable poc={result.poc} />
                <p className="mt-2 text-xs text-muted">
                  POC — сила с учётом силы соперников (1000 = лучший результат).
                  SOS — средняя сила соперников. В/Н/П — победы / ничьи / поражения. И — игры.
                </p>
              </section>

              {/* Cross-table */}
              <section>
                <h2 className="text-base font-bold mb-3">
                  Кросс-таблица личных встреч
                </h2>
                <p className="mb-3 text-xs text-muted">
                  Строки и столбцы упорядочены по рейтингу POC. В ячейке (строка vs столбец) —
                  счёт побед игрока строки против игрока столбца. Наведите на ячейку, чтобы увидеть подробности.
                </p>
                <CrossTable
                  crossPlayers={result.crossPlayers}
                  crossTable={result.crossTable}
                />
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function PocPage() {
  return (
    <Suspense>
      <PocCalculatorInner />
    </Suspense>
  );
}
