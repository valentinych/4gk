"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import type { SyrenyLiteChgkData } from "@/lib/syreny-lite-chgk";
import { SYRENY_LITE_CHGK } from "@/lib/syreny-lite";

const REFRESH_INTERVAL = 60;

function tourColumnMaxima(
  teams: SyrenyLiteChgkData["teams"],
  tourCount: number,
): (number | null)[] {
  const maxes = Array.from({ length: tourCount }, () => -Infinity);
  for (const team of teams) {
    for (let ti = 0; ti < tourCount; ti++) {
      maxes[ti] = Math.max(maxes[ti], team.tourScores[ti] ?? 0);
    }
  }
  return maxes.map((m) => (Number.isFinite(m) ? m : null));
}

export function ChgkResultsClient() {
  const [data, setData] = useState<SyrenyLiteChgkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/syreny-lite/chgk", { cache: "no-store" });
      const json = await res.json();
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
      if (remaining <= 1) fetchData().then(scheduleNextRefresh);
    }, 1000);
  }, [fetchData]);

  useEffect(() => {
    fetchData().then(scheduleNextRefresh);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, scheduleNextRefresh]);

  const tourMaxes = useMemo(
    () =>
      data?.configured && data.tours.length > 0
        ? tourColumnMaxima(data.teams, data.tours.length)
        : null,
    [data],
  );

  const mainCount = data?.teams.filter((t) => !t.outOfCompetition).length ?? 0;
  const outCount = (data?.teams.length ?? 0) - mainCount;

  return (
    <div id="page-syreny-lite-chgk" className="mx-auto max-w-[min(100%,80rem)] px-4 py-10 sm:px-6">
      <Link
        href="/mazowieckie-syreny-lite"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Syrenki Mazowieckie Lite
      </Link>

      <div id="page-syreny-lite-chgk-header" className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {SYRENY_LITE_CHGK.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Результаты синхронной игры · обновление каждую минуту
        </p>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      )}

      {error && !data && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !data.configured && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          Трансляция результатов будет подключена, как только станет известна
          ссылка на игру в haza.online.
        </div>
      )}

      {data?.configured && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Команд: <strong className="text-foreground">{data.teams.length}</strong>
                {outCount > 0 && (
                  <>
                    {" "}
                    · вне зачёта:{" "}
                    <strong className="text-foreground">{outCount}</strong>
                  </>
                )}
              </span>
              {data.lastQuestion > 0 && (
                <span className="text-xs font-medium text-accent">
                  Вопрос: {data.lastQuestion} / {data.totalQuestions}
                </span>
              )}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1">
                <RefreshCw
                  className={`h-3.5 w-3.5 text-muted ${loading ? "animate-spin" : ""}`}
                />
                <span className="text-xs font-mono tabular-nums">
                  {Math.floor(countdown / 60)}:
                  {String(countdown % 60).padStart(2, "0")}
                </span>
              </div>
              {updatedAt && (
                <span className="text-xs">
                  Обновлено:{" "}
                  {updatedAt.toLocaleTimeString("ru-RU", { timeZone: "Europe/Warsaw" })}
                </span>
              )}
            </div>
            {data.source && (
              <a
                href={data.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                haza.online <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <p className="mb-4 text-xs text-muted leading-relaxed">
            Сортировка по сумме вопросов. Команды «Вне зачёта» — внизу таблицы без
            нумерации. Лучший результат тура — тёмно-зелёный круг.
          </p>

          {data.teams.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
              В трансляции пока нет команд.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="text-sm border-collapse min-w-max w-full">
                <thead>
                  <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                    <th className="px-2 py-2.5 text-center font-medium w-10 sticky left-0 bg-surface z-10">
                      #
                    </th>
                    <th className="px-2 py-2.5 text-left font-medium min-w-[160px] sticky left-10 bg-surface z-10">
                      Команда
                    </th>
                    <th className="px-2 py-2.5 text-center font-medium w-12 bg-surface/50">
                      Σ
                    </th>
                    {data.tours.map((t) => (
                      <th
                        key={t.n}
                        className="px-2 py-2.5 text-center font-medium w-11"
                        title={`Тур ${t.n} · ${t.q} вопросов`}
                      >
                        Т{t.n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.teams.map((team) => (
                    <tr
                      key={`${team.name}-${team.city}`}
                      className={
                        team.outOfCompetition
                          ? "bg-zinc-50/80 text-muted"
                          : "hover:bg-surface/50"
                      }
                    >
                      <td className="px-2 py-1.5 text-center font-mono text-xs tabular-nums sticky left-0 bg-inherit z-10">
                        {team.place ?? ""}
                      </td>
                      <td className="px-2 py-1.5 sticky left-10 bg-inherit z-10">
                        <div className="font-medium">{team.name}</div>
                        {team.city && (
                          <div className="text-xs text-muted">{team.city}</div>
                        )}
                        {team.outOfCompetition && (
                          <span className="mt-0.5 inline-block text-[10px] text-muted">
                            вне зачёта
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold tabular-nums bg-surface/50">
                        {team.score}
                      </td>
                      {team.tourScores.map((s, ti) => {
                        const colMax = tourMaxes?.[ti];
                        const isBest = colMax != null && s === colMax && s > 0;
                        return (
                          <td
                            key={ti}
                            className="px-2 py-1.5 text-center font-mono text-xs tabular-nums"
                          >
                            {isBest ? (
                              <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-emerald-900 px-1.5 font-bold text-white">
                                {s}
                              </span>
                            ) : s > 0 ? (
                              s
                            ) : (
                              <span className="text-muted/40">0</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
