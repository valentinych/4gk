"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const REFRESH_INTERVAL = 120;

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

export default function TurnirushkiHazaResults({
  broadcastId,
  title,
}: {
  broadcastId: number;
  title: string;
}) {
  const [data, setData] = useState<HazaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/turnirushki/haza?broadcastId=${encodeURIComponent(String(broadcastId))}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json: HazaData = await res.json();
      setData(json);
      setError(null);
      setCountdown(REFRESH_INTERVAL);
    } catch {
      setError("Не удалось загрузить результаты трансляции");
    } finally {
      setLoading(false);
    }
  }, [broadcastId]);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchData();
          return REFRESH_INTERVAL;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  if (loading && !data) {
    return <p className="text-sm text-muted">Загрузка результатов…</p>;
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
        <p className="text-sm text-muted">{error}</p>
        <a
          href={`https://www.haza.online/broadcast/${broadcastId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
        >
          Открыть на haza.online <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  if (!data) return null;

  const tours = data.tours;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{title}</p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
          <span>{countdown} с</span>
          <a
            href={`https://www.haza.online/broadcast/${broadcastId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent font-medium"
          >
            haza.online <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 text-center w-10">М</th>
              <th className="px-3 py-2 text-left">Команда</th>
              <th className="px-3 py-2 text-left">Город</th>
              {tours.map((t) => (
                <th key={t.n} className="px-2 py-2 text-center w-10">
                  Т{t.n}
                </th>
              ))}
              <th className="px-3 py-2 text-right w-14">Σ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {[...data.teams]
              .sort((a, b) => a.pos - b.pos)
              .map((team) => {
                const tourScores = tourScoresFromAnswers(team.answers, tours);
                return (
                  <tr key={`${team.pos}-${team.name}`} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                      {team.pos}
                    </td>
                    <td className="px-3 py-2 font-medium">{team.name}</td>
                    <td className="px-3 py-2 text-muted text-xs">{team.city}</td>
                    {tourScores.map((s, i) => (
                      <td key={i} className="px-2 py-2 text-center font-mono tabular-nums">
                        {s}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                      {team.score}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
