"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { SheetTableData } from "@/lib/google-sheets";

const REFRESH_INTERVAL = 60;

const NUMERIC = /^-?\d+([.,]\d+)?$/;

function isNumericCell(value: string): boolean {
  return NUMERIC.test(value.trim());
}

export function TableWidgetClient({ widgetId }: { widgetId: string }) {
  const [data, setData] = useState<SheetTableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/page-widgets/${encodeURIComponent(widgetId)}/table`);
      const json = (await res.json()) as SheetTableData & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Ошибка загрузки");
      }
      setData(json);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [widgetId]);

  const scheduleNextRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const now = Date.now();
    const msToNext = REFRESH_INTERVAL * 1000 - (now % (REFRESH_INTERVAL * 1000));
    setCountdown(Math.ceil(msToNext / 1000));

    timerRef.current = setInterval(() => {
      const n = Date.now();
      const remaining = Math.ceil(
        ((REFRESH_INTERVAL * 1000 - (n % (REFRESH_INTERVAL * 1000))) / 1000),
      );
      setCountdown(remaining);
      if (remaining <= 1) {
        fetchData().then(scheduleNextRefresh);
      }
    }, 1000);
  }, [fetchData]);

  useEffect(() => {
    fetchData().then(scheduleNextRefresh);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, scheduleNextRefresh]);

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => fetchData().then(scheduleNextRefresh)}
          className="mt-3 text-sm text-accent hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const colCount = Math.max(
    data?.headers.length ?? 0,
    ...(data?.rows.map((r) => r.length) ?? [0]),
  );
  const empty = data != null && colCount === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5">
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted ${loading ? "animate-spin" : ""}`}
            />
            <span className="text-xs font-mono font-medium tabular-nums">
              {String(Math.floor(countdown / 60)).padStart(1, "0")}:
              {String(countdown % 60).padStart(2, "0")}
            </span>
          </div>
          {updatedAt && (
            <span className="text-xs text-muted">
              Обновлено: {updatedAt.toLocaleTimeString("ru", { timeZone: "Europe/Warsaw" })}
            </span>
          )}
        </div>
        {data?.viewUrl ? (
          <a
            href={data.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Google Sheets <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      {!data ? (
        <div className="rounded-xl border border-border bg-surface p-16 text-center">
          <RefreshCw className="h-6 w-6 text-muted animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Загрузка таблицы...</p>
        </div>
      ) : empty ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">Таблица пуста</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                {Array.from({ length: colCount }, (_, i) => (
                  <th
                    key={i}
                    className={`px-2 py-2.5 font-medium ${
                      i === 0
                        ? "text-left sticky left-0 bg-surface z-10"
                        : "text-center"
                    }`}
                  >
                    {data.headers[i] ?? ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-surface/50">
                  {Array.from({ length: colCount }, (_, ci) => {
                    const value = row[ci] ?? "";
                    const numeric = isNumericCell(value);
                    return (
                      <td
                        key={ci}
                        className={`px-2 py-1.5 ${
                          ci === 0
                            ? "sticky left-0 bg-surface z-10 font-medium whitespace-nowrap"
                            : numeric
                              ? "text-center font-mono text-xs tabular-nums"
                              : ""
                        }`}
                      >
                        {value || (ci === 0 ? "" : <span className="text-muted/30">—</span>)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
