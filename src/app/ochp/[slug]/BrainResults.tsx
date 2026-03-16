"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

interface GroupTeam {
  pos: string;
  name: string;
  played: number;
  win: number;
  draw: number;
  lost: number;
  zero: number;
  gf: number;
  ga: number;
  diff: number;
  points: number;
}

interface Group {
  time: string;
  letter: string;
  letterName: string;
  venue: string;
  type: "group" | "finals";
  teams: GroupTeam[];
}

interface FinalMatch {
  round: string;
  venue: string;
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
}

interface BrainData {
  groups: Group[];
  finals: FinalMatch[];
}

const REFRESH_INTERVAL = 60;

const ROUND_LABELS: Record<string, string> = {
  "1/2": "Полуфинал",
  "3rd": "За 3-е место",
  Final: "Финал",
};

export default function BrainResults({ tier }: { tier: string }) {
  const [data, setData] = useState<BrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ochp/brain?tier=${tier}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: BrainData = await res.json();
      setData(json);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [tier]);

  const scheduleNextRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const now = Date.now();
    const msToNext = (REFRESH_INTERVAL * 1000) - (now % (REFRESH_INTERVAL * 1000));
    setCountdown(Math.ceil(msToNext / 1000));

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
        </div>
        <a
          href="https://docs.google.com/spreadsheets/d/1gO2dKghCx671WqenavRioA8wBRLCd_i0Cby6j8qCo6M"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Google Sheets <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {!data ? (
        <div className="rounded-xl border border-border bg-white p-16 text-center">
          <RefreshCw className="h-6 w-6 text-muted animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Загрузка результатов...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {data.groups
            .filter((g) => g.type === "group")
            .map((group, gi) => (
              <div key={gi} className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-surface/50 border-b border-border">
                  <span className="text-xs font-bold text-accent">
                    Группа {group.letter}
                  </span>
                  {group.letterName && (
                    <span className="text-xs text-muted">({group.letterName})</span>
                  )}
                  {group.venue && (
                    <span className="text-xs text-muted mx-auto">{group.venue}</span>
                  )}
                  <span className="text-xs text-muted ml-auto">{group.time}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-[10px] text-muted uppercase tracking-wider">
                        <th className="px-2 py-1.5 text-right w-6">№</th>
                        <th className="px-2 py-1.5 text-left min-w-[120px]">Команда</th>
                        <th className="px-2 py-1.5 text-center w-6" title="Игры">И</th>
                        <th className="px-2 py-1.5 text-center w-6" title="Победы">В</th>
                        <th className="px-2 py-1.5 text-center w-6" title="Ничьи">Н</th>
                        <th className="px-2 py-1.5 text-center w-6" title="Поражения">П</th>
                        <th className="px-2 py-1.5 text-center w-8" title="Забито">З+</th>
                        <th className="px-2 py-1.5 text-center w-8" title="Пропущено">З−</th>
                        <th className="px-2 py-1.5 text-center w-8" title="Разница">±</th>
                        <th className="px-2 py-1.5 text-center w-8 bg-surface/50 font-bold" title="Очки">О</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.teams.map((t, ti) => (
                        <tr
                          key={ti}
                          className={`hover:bg-surface/50 ${ti < 2 ? "bg-emerald-50/30" : ""}`}
                        >
                          <td className="px-2 py-1.5 text-right text-muted font-mono">{t.pos}</td>
                          <td className="px-2 py-1.5 font-medium whitespace-nowrap">{t.name}</td>
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.played}</td>
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.win}</td>
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.draw}</td>
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.lost}</td>
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.gf}</td>
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.ga}</td>
                          <td className="px-2 py-1.5 text-center font-mono tabular-nums">
                            {t.diff > 0 ? `+${t.diff}` : t.diff}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono font-bold tabular-nums bg-surface/50">
                            {t.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

          {data.finals.length > 0 && (
            <div className="rounded-xl border border-border bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-surface/50 border-b border-border">
                <span className="text-xs font-bold text-accent">Финалы</span>
              </div>
              <div className="divide-y divide-border">
                {data.finals.map((f, fi) => (
                  <div key={fi} className="px-4 py-3">
                    <div className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
                      {ROUND_LABELS[f.round] ?? f.round} · {f.venue}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-medium flex-1 text-right ${f.scoreA > f.scoreB ? "font-bold" : ""}`}
                      >
                        {f.teamA}
                      </span>
                      <div className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1 font-mono text-sm font-bold tabular-nums">
                        <span>{f.scoreA}</span>
                        <span className="text-muted">:</span>
                        <span>{f.scoreB}</span>
                      </div>
                      <span
                        className={`text-sm font-medium flex-1 ${f.scoreB > f.scoreA ? "font-bold" : ""}`}
                      >
                        {f.teamB}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
