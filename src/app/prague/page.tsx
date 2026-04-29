"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";

interface TourResult {
  name: string;
  total: number;
  marks: (boolean | null)[];
}

interface TeamRow {
  team: string;
  city: string;
  number: string;
  total: number;
  place: string;
  tours: TourResult[];
}

interface PraguePayload {
  updatedAt: string;
  questionsPerTour: number;
  tours: { name: string }[];
  teams: TeamRow[];
}

const POLL_INTERVAL_MS = 30_000;
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/16nsdiqD9cd4Uw-XLH1TTrAhmG0EstAHvRCL_bVml0fc/edit?usp=sharing";

export default function PraguePage() {
  const [data, setData] = useState<PraguePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // expanded[`${teamKey}::${tourIdx}`] === true
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/prague", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PraguePayload;
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Пражма. Пражский полумарафон: 15 часов ЧГК
        </h1>
        <p className="mt-2 text-sm text-muted">
          Результаты обновляются автоматически каждые 30 секунд.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            Источник (Google Sheets) <ExternalLink className="h-3 w-3" />
          </a>
          {data?.updatedAt && (
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Обновлено:{" "}
              {new Date(data.updatedAt).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {loading && !data && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Загрузка результатов...
        </div>
      )}

      {error && !data && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Не удалось загрузить данные: {error}
        </div>
      )}

      {data && data.teams.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Нет данных о командах.
        </div>
      )}

      {data && data.teams.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 font-medium w-12">М</th>
                <th className="px-3 py-2.5 font-medium min-w-[180px]">Команда</th>
                <th className="px-3 py-2.5 font-medium min-w-[120px]">Город</th>
                <th className="px-3 py-2.5 text-right font-medium w-16">Σ</th>
                {data.tours.map((t, i) => (
                  <th
                    key={i}
                    className="px-3 py-2.5 text-right font-medium w-16 whitespace-nowrap"
                  >
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.teams.map((team, rowIdx) => {
                const teamKey = `${team.team}|${team.city}`;
                return (
                  <RowFragment
                    key={teamKey}
                    teamKey={teamKey}
                    rowIdx={rowIdx}
                    team={team}
                    questionsPerTour={data.questionsPerTour}
                    expanded={expanded}
                    onToggle={toggle}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface RowFragmentProps {
  teamKey: string;
  rowIdx: number;
  team: TeamRow;
  questionsPerTour: number;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
}

function RowFragment({
  teamKey,
  rowIdx,
  team,
  questionsPerTour,
  expanded,
  onToggle,
}: RowFragmentProps) {
  const expandedTours = team.tours
    .map((_, idx) => idx)
    .filter((idx) => expanded[`${teamKey}::${idx}`]);

  // Alternating red-tinted rows.
  const stripe =
    rowIdx % 2 === 0 ? "bg-red-50/60 dark:bg-red-950/20" : "bg-transparent";

  return (
    <>
      <tr className={`${stripe} border-b border-red-100/60 dark:border-red-900/30 hover:bg-red-100/60 dark:hover:bg-red-900/30 transition-colors`}>
        <td className="px-3 py-2.5 font-bold text-muted whitespace-nowrap">{team.place}</td>
        <td className="px-3 py-2.5 font-medium">{team.team}</td>
        <td className="px-3 py-2.5 text-muted">{team.city}</td>
        <td className="px-3 py-2.5 text-right font-mono font-bold">{team.total}</td>
        {team.tours.map((tour, ti) => {
          const key = `${teamKey}::${ti}`;
          const isOpen = !!expanded[key];
          return (
            <td key={ti} className="px-1 py-1 text-right">
              <button
                onClick={() => onToggle(key)}
                className={`inline-flex w-full items-center justify-end gap-1 rounded px-2 py-1 font-mono transition-colors hover:bg-red-200/50 dark:hover:bg-red-800/40 ${
                  isOpen ? "bg-red-200/60 dark:bg-red-800/50" : ""
                }`}
                title={`Раскрыть тур ${ti + 1}`}
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 text-muted" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted" />
                )}
                <span>{tour.total}</span>
              </button>
            </td>
          );
        })}
      </tr>
      {expandedTours.map((tourIdx) => {
        const tour = team.tours[tourIdx];
        const baseQuestionNum = tourIdx * questionsPerTour;
        return (
          <tr
            key={`${teamKey}-detail-${tourIdx}`}
            className={`${stripe} border-b border-red-100/60 dark:border-red-900/30`}
          >
            <td colSpan={4 + team.tours.length} className="px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                {tour.name} — {tour.total} из {questionsPerTour}
              </div>
              <div className="grid grid-cols-12 gap-1 sm:grid-cols-18">
                {tour.marks.map((m, qi) => {
                  const qNum = baseQuestionNum + qi + 1;
                  return (
                    <div
                      key={qi}
                      className={`flex flex-col items-center rounded px-1 py-1 text-xs font-mono ${
                        m === true
                          ? "bg-green-100 text-green-800"
                          : m === false
                            ? "bg-red-100 text-red-700"
                            : "bg-surface text-muted"
                      }`}
                      title={`Вопрос ${qNum}: ${
                        m === true ? "взят" : m === false ? "не взят" : "—"
                      }`}
                    >
                      <span className="text-[10px] text-muted leading-none">
                        {qNum}
                      </span>
                      <span className="font-bold leading-none">
                        {m === true ? "+" : m === false ? "−" : "·"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
