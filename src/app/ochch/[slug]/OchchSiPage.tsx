"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { OchchSiPayload, SiPlayoffRound, SiRoom } from "@/lib/ochch-si";

const POLL_MS = 30_000;

function isNumeric(value: string): boolean {
  return /^-?\d+(?:[.,]\d+)?$/.test(value);
}

function cellClass(value: string, roomStart: boolean): string {
  const parts = ["px-2.5 py-2 align-middle min-w-[6.5rem]"];
  if (roomStart) parts.push("border-l border-border");
  if (!value) return parts.join(" ");
  if (isNumeric(value)) {
    parts.push("text-center font-mono text-xs tabular-nums whitespace-nowrap");
  } else {
    parts.push("text-left font-medium break-words");
  }
  return parts.join(" ");
}

function QualifyingTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  if (headers.length === 0) {
    return <p className="text-sm text-muted">Таблица пуста</p>;
  }
  return (
    <div className="max-w-4xl overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
            {headers.map((header, i) => (
              <th
                key={`${header}-${i}`}
                scope="col"
                className={`px-2.5 py-2.5 font-medium whitespace-nowrap ${
                  i === 0 ? "text-left" : "text-center"
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-3 text-sm text-muted">
                Пока нет результатов
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-surface/50">
                {headers.map((_, ci) => {
                  const value = row[ci] ?? "";
                  const numeric = isNumeric(value);
                  return (
                    <td
                      key={ci}
                      className={`px-2.5 py-1.5 ${
                        ci === 0
                          ? "text-left font-medium"
                          : numeric
                            ? "text-center font-mono text-xs tabular-nums whitespace-nowrap"
                            : "text-center"
                      }`}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PlayoffRoundTable({
  round,
  rooms,
}: {
  round: SiPlayoffRound;
  rooms: SiRoom[];
}) {
  const colCount = rooms.reduce((sum, room) => sum + room.width, 0);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/10">
            {rooms.map((room, i) => (
              <th
                key={`${room.name}-${i}`}
                scope="colgroup"
                colSpan={room.width}
                className={`px-2.5 py-2.5 text-center text-sm font-semibold ${
                  i > 0 ? "border-l border-border" : ""
                }`}
              >
                {room.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {round.rows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(colCount, 1)} className="px-3 py-3 text-sm text-muted">
                Пока пусто
              </td>
            </tr>
          ) : (
            round.rows.map((line, ri) => (
              <tr key={ri} className="border-t border-border hover:bg-surface/50">
                {line.map((hall, hi) =>
                  hall.map((value, si) => (
                    <td key={`${hi}-${si}`} className={cellClass(value, si === 0 && hi > 0)}>
                      {value}
                    </td>
                  )),
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function OchchSiPage() {
  const [data, setData] = useState<OchchSiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ochch/si", { cache: "no-store" });
      const json = (await res.json()) as OchchSiPayload & { error?: string };
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

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (!data && loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-16 text-center">
        <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-muted" />
        <p className="text-sm text-muted">Загрузка таблицы...</p>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 text-sm text-accent hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!data) return null;

  const updated = updatedAt
    ? updatedAt.toLocaleTimeString("ru", { timeZone: "Europe/Warsaw" })
    : null;

  return (
    <div id="page-ochch-results-si" className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5">
          <RefreshCw className={`h-3.5 w-3.5 text-muted ${loading ? "animate-spin" : ""}`} />
          <span className="text-xs text-muted">
            {updated ? `Обновлено: ${updated}` : "Обновление"}
            {" · "}
            каждые 30 с
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-accent hover:underline"
          >
            Обновить
          </button>
          <a
            href={data.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Google Sheets <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section id="ochch-si-qualifying" className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Отбор</h2>
        <QualifyingTable headers={data.qualifying.headers} rows={data.qualifying.rows} />
      </section>

      <section id="ochch-si-playoff" className="space-y-5">
        <h2 className="text-lg font-bold tracking-tight">Плей-офф</h2>
        {data.playoff.rounds.length === 0 ? (
          <p className="text-sm text-muted">Таблица пуста</p>
        ) : (
          data.playoff.rounds.map((round) => (
            <div key={round.title} className="space-y-2">
              <h3 className="text-sm font-bold">{round.title}</h3>
              {data.playoff.rooms.length > 0 ? (
                <PlayoffRoundTable round={round} rooms={data.playoff.rooms} />
              ) : (
                <p className="text-sm text-muted">Пока пусто</p>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
