"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

const REFRESH_INTERVAL = 60;

interface TminnoeTable {
  headers: string[];
  summary: string[][];
  rows: string[][];
  viewUrl: string;
}

function isSumHeader(label: string): boolean {
  const t = label.trim();
  return /^Σ\d+$/.test(t) || t === "Рез";
}

function isPlaceHeader(label: string): boolean {
  return label.trim() === "Место";
}

function startsGroup(label: string): boolean {
  const t = label.trim();
  return t === "Блок" || t === "+" || t === "1Б+" || t === "ДП2" || t === "Magic number";
}

export function OchchTminnoePage() {
  const [data, setData] = useState<TminnoeTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ochch/tminnoe");
      const json = (await res.json()) as TminnoeTable & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Ошибка загрузки");
      setData(json);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleNextRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const now = Date.now();
    const msToNext = REFRESH_INTERVAL * 1000 - (now % (REFRESH_INTERVAL * 1000));
    setCountdown(Math.ceil(msToNext / 1000));

    timerRef.current = setInterval(() => {
      const n = Date.now();
      const remaining = Math.ceil(
        (REFRESH_INTERVAL * 1000 - (n % (REFRESH_INTERVAL * 1000))) / 1000,
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

  const headers = data?.headers ?? [];
  const empty = data != null && headers.length === 0;
  const stickyNum = headers[0]?.trim() === "№";
  const stickyName = headers[1]?.trim() === "Команда";

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
          <table className="w-full min-w-max border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="text-muted">
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className={headClass(header, i, stickyNum, stickyName)}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.summary.map((row, ri) => (
                <tr key={`s-${ri}`} className="text-muted">
                  {headers.map((header, ci) => (
                    <td
                      key={ci}
                      className={cellClass(header, ci, stickyNum, stickyName, true)}
                    >
                      {row[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
              {data.rows.map((row, ri) => (
                <tr key={ri}>
                  {headers.map((header, ci) => (
                    <td
                      key={ci}
                      className={cellClass(header, ci, stickyNum, stickyName, false)}
                    >
                      {row[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function headClass(
  header: string,
  index: number,
  stickyNum: boolean,
  stickyName: boolean,
): string {
  const emphasized = isSumHeader(header) || isPlaceHeader(header);
  return [
    "border-b border-border px-1.5 py-2 font-medium whitespace-nowrap",
    emphasized ? "bg-surface-hover" : "bg-surface",
    alignClass(header, index, stickyName),
    stickyClass(index, stickyNum, stickyName, true),
    groupClass(header),
  ].join(" ");
}

function cellClass(
  header: string,
  index: number,
  stickyNum: boolean,
  stickyName: boolean,
  summary: boolean,
): string {
  const name = stickyName && index === 1;
  const emphasized = isSumHeader(header) || isPlaceHeader(header);
  const sticky = (stickyNum && index === 0) || name;
  return [
    "border-b border-border px-1.5 py-1.5",
    emphasized ? "bg-surface-hover font-semibold" : sticky || summary ? "bg-surface" : "",
    summary ? "text-muted" : "hover:bg-surface-hover",
    alignClass(header, index, stickyName),
    name ? "font-medium max-md:max-w-36 max-md:whitespace-normal max-md:break-words" : "",
    !name && header.trim() !== "Блок" ? "font-mono tabular-nums" : "",
    stickyClass(index, stickyNum, stickyName, false),
    groupClass(header),
  ].join(" ");
}

function alignClass(header: string, index: number, stickyName: boolean): string {
  if (stickyName && index === 1) return "text-left";
  if (header.trim() === "Блок") return "text-left";
  return "text-center";
}

function stickyClass(
  index: number,
  stickyNum: boolean,
  stickyName: boolean,
  head: boolean,
): string {
  const z = head ? "z-20" : "z-10";
  if (stickyNum && index === 0) return `sticky left-0 ${z} w-8 min-w-8`;
  if (stickyName && index === 1) return `sticky left-8 ${z} min-w-36 border-r border-border`;
  return "";
}

function groupClass(header: string): string {
  return startsGroup(header) || isPlaceHeader(header) ? "border-l border-border" : "";
}
