"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BarChart3, ChevronRight, Loader2, ExternalLink, X } from "lucide-react";
import type { PocResult, PocCrossCell } from "@/lib/parsers/poc-calculator";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiResult = PocResult & { error?: string };

// ─── POC Rating Table ─────────────────────────────────────────────────────────

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

// ─── Cross-table ──────────────────────────────────────────────────────────────

interface Popup {
  pA: string;
  pB: string;
  cell: PocCrossCell;
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
  const [popup, setPopup] = useState<Popup | null>(null);

  /** Returns the cell always from pA's perspective (winsA = pA's wins). */
  function getCellFor(pA: string, pB: string): PocCrossCell | null {
    const direct = crossTable[`${pA}|||${pB}`];
    if (direct) return direct;
    const rev = crossTable[`${pB}|||${pA}`];
    if (rev)
      return {
        ...rev,
        winsA: rev.winsB,
        winsB: rev.winsA,
        bouts: rev.bouts.map((b) => ({ ...b, scoreA: b.scoreB, scoreB: b.scoreA })),
      };
    return null;
  }

  function handleCellClick(e: React.MouseEvent, pA: string, pB: string) {
    const cell = getCellFor(pA, pB);
    if (!cell || !cell.total) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    if (x + 150 > window.innerWidth) x = window.innerWidth - 160;
    if (x < 150) x = 160;
    if (y < 250) y = rect.bottom + 8;

    setPopup({ pA, pB, cell, x, y });
  }

  if (!crossPlayers.length) return null;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="text-xs whitespace-nowrap border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-1.5 py-2 text-left font-medium text-muted sticky left-0 bg-white z-10 min-w-[28px]">
                №
              </th>
              <th className="px-2 py-2 text-left font-medium text-muted sticky left-7 bg-white z-10 min-w-[120px]">
                Игрок
              </th>
              {crossPlayers.map((_, i) => (
                <th
                  key={i}
                  className="px-1 py-2 text-center font-medium text-muted w-10"
                  title={crossPlayers[i]}
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crossPlayers.map((pA, i) => (
              <tr key={pA} className="border-b border-border/50 hover:bg-surface/30">
                <td className="px-1.5 py-1.5 font-bold text-muted sticky left-0 bg-white z-[5]">
                  {i + 1}
                </td>
                <td
                  className="px-2 py-1.5 font-medium sticky left-7 bg-white z-[5]"
                  title={pA}
                >
                  {pA}
                </td>
                {crossPlayers.map((pB, j) => {
                  if (i === j) return <td key={j} className="bg-gray-200" />;

                  const cell = getCellFor(pA, pB);
                  if (!cell || !cell.total)
                    return (
                      <td key={j} className="px-1 py-1.5 text-center text-gray-300">
                        —
                      </td>
                    );

                  const cls =
                    cell.winsA > cell.winsB
                      ? "text-green-600"
                      : cell.winsA < cell.winsB
                        ? "text-red-500"
                        : "text-amber-600";

                  return (
                    <td
                      key={j}
                      className={`px-1 py-1.5 text-center font-semibold cursor-pointer hover:bg-accent/10 ${cls}`}
                      onClick={(e) => handleCellClick(e, pA, pB)}
                    >
                      {cell.winsA}:{cell.winsB}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Click popup — fixed, same as Warsaw */}
      {popup && (
        <div className="fixed inset-0 z-50" onClick={() => setPopup(null)}>
          <div
            className="absolute bg-white rounded-xl shadow-2xl border border-border p-4 min-w-[280px] max-h-[70vh] overflow-y-auto"
            style={{
              left: popup.x,
              top: popup.y,
              transform: "translate(-50%, -100%)",
              marginTop: "-8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">
                {popup.pA} — {popup.pB}
              </span>
              <button
                onClick={() => setPopup(null)}
                className="text-muted hover:text-foreground ml-3"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center text-xl font-bold text-foreground mb-3">
              {popup.cell.winsA} : {popup.cell.winsB}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="py-1 text-left font-medium">Тур</th>
                  <th className="py-1 text-center font-medium">Результат</th>
                  <th className="py-1 text-right font-medium">Счёт</th>
                </tr>
              </thead>
              <tbody>
                {popup.cell.bouts.map((bout, idx) => {
                  const isWin = bout.scoreA > bout.scoreB;
                  const isLoss = bout.scoreA < bout.scoreB;
                  return (
                    <tr key={idx} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 text-muted text-xs">
                        {bout.tourName}, бой {bout.boutIdx}
                      </td>
                      <td
                        className={`py-1.5 text-center font-medium ${
                          isWin
                            ? "text-green-600"
                            : isLoss
                              ? "text-red-500"
                              : "text-amber-600"
                        }`}
                      >
                        {isWin ? "победа" : isLoss ? "поражение" : "ничья"}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {bout.scoreA} : {bout.scoreB}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
          <div className="flex-1">
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

      {/* Loading */}
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

              <section>
                <h2 className="text-base font-bold mb-3">
                  Кросс-таблица личных встреч
                </h2>
                <p className="mb-3 text-xs text-muted">
                  Строки и столбцы упорядочены по рейтингу POC.
                  В ячейке — счёт побед строки против столбца. Нажмите на ячейку для деталей.
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

export default function PocPage() {
  return (
    <Suspense>
      <PocCalculatorInner />
    </Suspense>
  );
}
