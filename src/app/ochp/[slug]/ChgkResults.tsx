"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { OCHP_CHGK_HAZA_BROADCAST_CURRENT } from "@/lib/ochp-seasons";

interface HazaTour {
  n: number;
  q: number;
}

interface HazaTeam {
  pos: number;
  name: string;
  city: string;
  answers: string;
  score: number;
  group: number;
}

interface HazaData {
  tours: HazaTour[];
  teams: HazaTeam[];
  lastQuestion: number;
}

const REFRESH_INTERVAL = 60;

function tourScoresFromAnswers(answers: string, tours: HazaTour[]): number[] {
  const scores: number[] = [];
  let offset = 0;
  for (const tour of tours) {
    let s = 0;
    for (let i = 0; i < tour.q; i++) {
      if (answers[offset + i] === "1") s++;
    }
    scores.push(s);
    offset += tour.q;
  }
  return scores;
}

function hazaTourColumnMaxima(
  teams: HazaTeam[],
  tours: HazaTour[],
): (number | null)[] {
  const n = tours.length;
  const maxes = Array.from({ length: n }, () => -Infinity);
  for (const team of teams) {
    const sc = tourScoresFromAnswers(team.answers, tours);
    for (let ti = 0; ti < n; ti++) {
      maxes[ti] = Math.max(maxes[ti], sc[ti] ?? 0);
    }
  }
  return maxes.map((m) => (Number.isFinite(m) ? m : null));
}

export default function ChgkResults({
  broadcastId = OCHP_CHGK_HAZA_BROADCAST_CURRENT,
}: {
  broadcastId?: number;
}) {
  const [data, setData] = useState<HazaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/ochp/haza?broadcastId=${encodeURIComponent(String(broadcastId))}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json: HazaData = await res.json();
      setData(json);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [broadcastId]);

  const scheduleNextRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const now = Date.now();
    const msToNextMinute = (REFRESH_INTERVAL * 1000) - (now % (REFRESH_INTERVAL * 1000));
    const secsLeft = Math.ceil(msToNextMinute / 1000);
    setCountdown(secsLeft);

    timerRef.current = setInterval(() => {
      const n = Date.now();
      const remaining = Math.ceil(
        ((REFRESH_INTERVAL * 1000) - (n % (REFRESH_INTERVAL * 1000))) / 1000,
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

  const handleManualRefresh = () => {
    fetchData().then(scheduleNextRefresh);
  };

  const tourMaxes = useMemo(
    () => (data ? hazaTourColumnMaxima(data.teams, data.tours) : null),
    [data],
  );

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={handleManualRefresh}
          className="mt-3 text-sm text-accent hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

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
              Обновлено: {updatedAt.toLocaleTimeString("ru")}
            </span>
          )}
          {data && data.lastQuestion > 0 && (
            <span className="text-xs font-medium text-accent">
              Вопрос: {data.lastQuestion} / {data.tours.reduce((a, t) => a + t.q, 0)}
            </span>
          )}
        </div>
        <a
          href={`https://www.haza.online/broadcast/${broadcastId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          haza.online <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {!data ? (
        <div className="rounded-xl border border-border bg-surface p-16 text-center">
          <RefreshCw className="h-6 w-6 text-muted animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Загрузка результатов...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <p className="text-xs text-muted px-3 pt-3 pb-1">
            Лучший результат тура (или ничья за 1-е место в туре) — тёмно-зелёный круг с белой цифрой.
          </p>
          <table className="text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                <th className="px-1.5 sm:px-2 py-2.5 text-right font-medium w-7 sm:w-8 sticky left-0 bg-surface z-10">
                  №
                </th>
                <th className="px-1.5 sm:px-2 py-2.5 text-left font-medium sticky left-7 sm:left-8 bg-surface z-10 max-w-[120px] sm:max-w-none">
                  Команда
                </th>
                <th className="px-1.5 sm:px-2 py-2.5 text-center font-medium w-9 sm:w-10 bg-surface/50">
                  Σ
                </th>
                {data.tours.map((t) => (
                  <th
                    key={t.n}
                    className="px-1.5 sm:px-2 py-2.5 text-center font-medium w-9 sm:w-10"
                  >
                    Т{t.n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.teams.map((team, i) => {
                const scores = tourScoresFromAnswers(team.answers, data.tours);
                return (
                  <tr
                    key={i}
                    className="hover:bg-surface/50"
                  >
                    <td className="px-1.5 sm:px-2 py-1.5 text-right text-muted font-mono text-xs sticky left-0 bg-surface z-10">
                      {team.pos}
                    </td>
                    <td className="px-1.5 sm:px-2 py-1.5 sticky left-7 sm:left-8 bg-surface z-10 max-w-[120px] sm:max-w-none">
                      <div className="flex items-start gap-1">
                        <span className="font-medium text-sm leading-tight break-words min-w-0">
                          {team.name}
                        </span>
                        {team.group === 0 && (
                          <span
                            className="inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-border overflow-hidden shrink-0 mt-0.5"
                            title="Зачёт ЧСт"
                          >
                            <span className="block w-full h-1/2 bg-surface" />
                            <span className="block w-full h-1/2 bg-red-500" />
                          </span>
                        )}
                        <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">{team.city}</span>
                      </div>
                    </td>
                    <td className="px-1.5 sm:px-2 py-1.5 text-center font-mono text-sm font-bold tabular-nums bg-surface/50">
                      {team.score}
                    </td>
                    {scores.map((s, ti) => {
                      const colMax = tourMaxes?.[ti];
                      const isTourBest =
                        colMax != null && s === colMax;
                      return (
                        <td
                          key={ti}
                          className="px-1.5 sm:px-2 py-1.5 text-center font-mono text-xs tabular-nums"
                        >
                          {isTourBest ? (
                            <span
                              className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-emerald-900 px-1.5 font-bold text-white tabular-nums shadow-sm"
                              title={`Максимум тура Т${data.tours[ti]?.n ?? ti + 1}: ${colMax}`}
                            >
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
