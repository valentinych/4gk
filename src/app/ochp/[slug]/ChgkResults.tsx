"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

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

export default function ChgkResults() {
  const [data, setData] = useState<HazaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ochp/haza");
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
  }, []);

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

  const tourScores = (answers: string, tours: HazaTour[]): number[] => {
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
  };

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
          href="https://www.haza.online/broadcast/641"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          haza.online <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {!data ? (
        <div className="rounded-xl border border-border bg-white p-16 text-center">
          <RefreshCw className="h-6 w-6 text-muted animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Загрузка результатов...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                <th className="px-2 py-2.5 text-right font-medium w-8 sticky left-0 bg-white z-10">
                  №
                </th>
                <th className="px-2 py-2.5 text-left font-medium sticky left-8 bg-white z-10">
                  Команда
                </th>
                <th className="px-2 py-2.5 text-center font-medium w-10 bg-surface/50">
                  Σ
                </th>
                {data.tours.map((t) => (
                  <th
                    key={t.n}
                    className="px-2 py-2.5 text-center font-medium w-10"
                  >
                    Т{t.n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.teams.map((team, i) => {
                const scores = tourScores(team.answers, data.tours);
                return (
                  <tr
                    key={i}
                    className={`hover:bg-surface/50 ${team.group === 0 ? "" : ""}`}
                  >
                    <td className="px-2 py-1.5 text-right text-muted font-mono text-xs sticky left-0 bg-white z-10">
                      {team.pos}
                    </td>
                    <td className="px-2 py-1.5 sticky left-8 bg-white z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium whitespace-nowrap text-sm">
                          {team.name}
                        </span>
                        {team.group === 0 && (
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-full border border-border overflow-hidden shrink-0"
                            title="Польский зачёт"
                          >
                            <span className="block w-full h-1/2 bg-white" />
                            <span className="block w-full h-1/2 bg-red-500" />
                          </span>
                        )}
                        <span className="text-xs text-muted whitespace-nowrap">{team.city}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-sm font-bold tabular-nums bg-surface/50">
                      {team.score}
                    </td>
                    {scores.map((s, ti) => (
                      <td
                        key={ti}
                        className="px-2 py-1.5 text-center font-mono text-xs tabular-nums"
                      >
                        {s > 0 ? s : <span className="text-muted/40">0</span>}
                      </td>
                    ))}
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
