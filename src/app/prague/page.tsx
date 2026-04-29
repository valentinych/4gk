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
  tours: { name: string; questionCount: number }[];
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
        <div className="overflow-x-auto rounded-xl border-2 border-red-300 dark:border-red-700 shadow-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-red-600 to-rose-600 text-left text-xs uppercase tracking-wider text-white">
                <th className="px-3 py-3 font-bold w-12">М</th>
                <th className="px-3 py-3 font-bold min-w-[180px]">Команда</th>
                <th className="px-3 py-3 font-bold min-w-[120px]">Город</th>
                <th className="px-3 py-3 text-right font-bold w-16">Σ</th>
                {data.tours.map((t, i) => (
                  <th
                    key={i}
                    className="px-3 py-3 text-right font-bold w-16 whitespace-nowrap"
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
                    tours={data.tours}
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
  tours: { name: string; questionCount: number }[];
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
}

function RowFragment({
  teamKey,
  rowIdx,
  team,
  tours,
  expanded,
  onToggle,
}: RowFragmentProps) {
  const tourOffsets: number[] = [];
  {
    let acc = 0;
    for (const t of tours) {
      tourOffsets.push(acc);
      acc += t.questionCount;
    }
  }
  const expandedTours = team.tours
    .map((_, idx) => idx)
    .filter((idx) => expanded[`${teamKey}::${idx}`]);

  // Bright alternating red shades, no grey.
  const stripe =
    rowIdx % 2 === 0
      ? "bg-rose-100 dark:bg-rose-900/40"
      : "bg-amber-50 dark:bg-amber-900/20";

  return (
    <>
      <tr
        className={`${stripe} border-b border-red-200 dark:border-red-800 hover:bg-yellow-200 dark:hover:bg-yellow-800/40 transition-colors`}
      >
        <td className="px-3 py-2.5 font-extrabold text-red-950 dark:text-red-100 whitespace-nowrap">
          {team.place}
        </td>
        <td className="px-3 py-2.5 font-semibold text-red-950 dark:text-red-100">
          {team.team.length > 30 ? (
            <span
              className="block text-xs leading-tight"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              title={team.team}
            >
              {team.team}
            </span>
          ) : (
            team.team
          )}
        </td>
        <td className="px-3 py-2.5 font-semibold text-red-950 dark:text-red-100">{team.city}</td>
        <td className="px-3 py-2.5 text-right font-mono text-base font-extrabold text-red-950 dark:text-red-100">
          {team.total}
        </td>
        {team.tours.map((tour, ti) => {
          const key = `${teamKey}::${ti}`;
          const isOpen = !!expanded[key];
          return (
            <td key={ti} className="px-1 py-1 text-right">
              <button
                onClick={() => onToggle(key)}
                className={`inline-flex w-full items-center justify-end gap-1 rounded px-2 py-1 font-mono font-bold text-red-950 dark:text-red-100 transition-colors hover:bg-rose-300 dark:hover:bg-rose-700 ${
                  isOpen ? "bg-rose-300 dark:bg-rose-700" : ""
                }`}
                title={`Раскрыть тур ${ti + 1}`}
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>{tour.total}</span>
              </button>
            </td>
          );
        })}
      </tr>
      {expandedTours.map((tourIdx) => {
        const tour = team.tours[tourIdx];
        const baseQuestionNum = tourOffsets[tourIdx] ?? 0;
        const qCount = tours[tourIdx]?.questionCount ?? tour.marks.length;
        return (
          <tr
            key={`${teamKey}-detail-${tourIdx}`}
            className={`${stripe} border-b border-red-200 dark:border-red-800`}
          >
            <td colSpan={4 + team.tours.length} className="px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300 mb-2">
                {tour.name} — {tour.total} из {qCount}
              </div>
              <div className="grid grid-cols-12 gap-1 sm:grid-cols-18">
                {tour.marks.map((m, qi) => {
                  const qNum = baseQuestionNum + qi + 1;
                  return (
                    <div
                      key={qi}
                      className={`flex flex-col items-center rounded px-1 py-1 text-xs font-mono ${
                        m === true
                          ? "bg-emerald-400 text-white"
                          : m === false
                            ? "bg-red-500 text-white"
                            : "bg-amber-200 text-amber-900"
                      }`}
                      title={`Вопрос ${qNum}: ${
                        m === true ? "взят" : m === false ? "не взят" : "—"
                      }`}
                    >
                      <span className="text-[10px] leading-none opacity-80">
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
