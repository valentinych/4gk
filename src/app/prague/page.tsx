"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";

import {
  lastQuestionWithAnyPlus,
  teamRatingSum,
  type PragueTeamRow,
} from "@/lib/prague-stats";

interface PraguePayload {
  updatedAt: string;
  tours: { name: string; questionCount: number }[];
  teams: PragueTeamRow[];
}

const POLL_INTERVAL_MS = 30_000;
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/16nsdiqD9cd4Uw-XLH1TTrAhmG0EstAHvRCL_bVml0fc/edit?usp=sharing";

/** Fullscreen table: keep one line, trim long names (prefer break at last space). */
function truncateTeamNameFullscreen(name: string, maxLen = 36): string {
  if (name.length <= maxLen) return name;
  const slice = name.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const cut =
    lastSpace > Math.floor(maxLen * 0.35)
      ? slice.slice(0, lastSpace).trimEnd()
      : slice.trimEnd();
  return `${cut}…`;
}

export default function PraguePage() {
  const [data, setData] = useState<PraguePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // expanded[`${teamKey}::${tourIdx}`] === true
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const fitWrapRef = useRef<HTMLDivElement | null>(null);
  const fitTableRef = useRef<HTMLTableElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [showRating, setShowRating] = useState(false);

  const lastQuestionEntered = useMemo(
    () => (data ? lastQuestionWithAnyPlus(data.teams, data.tours) : 0),
    [data],
  );

  const ratingByTeamKey = useMemo(() => {
    if (!data) return new Map<string, number>();
    const { teams, tours } = data;
    const m = new Map<string, number>();
    for (const t of teams) {
      m.set(
        `${t.team}|${t.city}`,
        teamRatingSum(t, teams, tours),
      );
    }
    return m;
  }, [data]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  // Fit-to-viewport: scale the whole table down so all rows fit on one screen
  // in fullscreen mode without scrolling.
  useEffect(() => {
    if (!fullscreen) {
      setFitScale(1);
      return;
    }
    const recalc = () => {
      const wrap = fitWrapRef.current;
      const tbl = fitTableRef.current;
      if (!wrap || !tbl) return;
      const tw = tbl.scrollWidth;
      const th = tbl.scrollHeight;
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;
      if (!tw || !th || !cw || !ch) return;
      const s = Math.min(1, cw / tw, ch / th);
      setFitScale(s > 0 ? s : 1);
    };
    const raf = requestAnimationFrame(recalc);
    const t = setTimeout(recalc, 60);
    const ro = new ResizeObserver(recalc);
    if (fitWrapRef.current) ro.observe(fitWrapRef.current);
    if (fitTableRef.current) ro.observe(fitTableRef.current);
    window.addEventListener("resize", recalc);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [fullscreen, data, expanded, showRating]);

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
          Pražma 2026. Пражский полумарафон: 15 часов ЧГК
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
        {data && lastQuestionEntered > 0 && (
          <p className="mt-3 text-sm font-medium text-foreground">
            После {lastQuestionEntered} вопроса
          </p>
        )}
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
        <div
          className={
            fullscreen
              ? "fixed inset-0 z-50 flex flex-col bg-background p-4 sm:p-6"
              : ""
          }
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              {fullscreen && lastQuestionEntered > 0 && (
                <span className="text-sm font-medium text-foreground">
                  После {lastQuestionEntered} вопроса
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowRating((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {showRating ? "Скрыть рейтинг" : "Показать рейтинг"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={fullscreen ? "Свернуть" : "Во весь экран"}
            >
              {fullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  Свернуть
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  Во весь экран
                </>
              )}
            </button>
          </div>
          <div
            ref={fitWrapRef}
            className={`rounded-xl border border-border bg-surface shadow-sm ${
              fullscreen
                ? "flex-1 overflow-hidden flex justify-center items-start"
                : "overflow-auto"
            }`}
          >
          <div
            style={
              fullscreen
                ? {
                    transform: `scale(${fitScale})`,
                    transformOrigin: "top center",
                  }
                : undefined
            }
          >
          <table
            ref={fitTableRef}
            className={fullscreen ? "text-sm" : "w-full text-sm"}
          >
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 text-left text-xs uppercase tracking-wider text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <th className={`font-semibold w-12 ${fullscreen ? "px-1 py-0.5 text-center" : "px-3 py-3"}`}>М</th>
                  <th className={`font-semibold ${fullscreen ? "px-1 py-0.5 text-center text-sm" : "px-3 py-3 min-w-[180px]"}`}>Команда</th>
                  <th className={`hidden sm:table-cell font-semibold ${fullscreen ? "px-1 py-0.5 text-center" : "px-3 py-3 min-w-[120px]"}`}>Город</th>
                  <th className={`text-right font-semibold w-16 ${fullscreen ? "px-1 py-0.5 text-sm tabular-nums" : "px-3 py-3"}`}>Σ</th>
                  {showRating && (
                    <th className={`text-right font-semibold ${fullscreen ? "px-1 py-0.5 text-xs tabular-nums font-normal normal-case text-muted" : "px-3 py-3 text-xs font-normal normal-case text-muted"}`}>Рейтинг</th>
                  )}
                  {data.tours.map((t, i) => (
                    <th
                      key={i}
                      className={`text-right font-semibold w-16 whitespace-nowrap ${fullscreen ? "px-1 py-0.5" : "px-3 py-3"}`}
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
                      compact={fullscreen}
                      showRating={showRating}
                      ratingSum={ratingByTeamKey.get(teamKey) ?? 0}
                      ordinalPlace={rowIdx + 1}
                    />
                  );
                })}
              </tbody>
          </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface RowFragmentProps {
  teamKey: string;
  rowIdx: number;
  team: PragueTeamRow;
  tours: { name: string; questionCount: number }[];
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  compact?: boolean;
  showRating: boolean;
  ratingSum: number;
  ordinalPlace: number;
}

function RowFragment({
  teamKey,
  rowIdx,
  team,
  tours,
  expanded,
  onToggle,
  compact = false,
  showRating,
  ratingSum,
  ordinalPlace,
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

  // Neutral alternating gray stripes with default text color.
  const stripe =
    rowIdx % 2 === 0
      ? "bg-white dark:bg-gray-900"
      : "bg-gray-50 dark:bg-gray-800/50";

  return (
    <>
      <tr
        className={`${stripe} border-b border-border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
      >
        <td className={`font-extrabold whitespace-nowrap ${compact ? "px-1 py-0.5 text-center text-sm tabular-nums" : "px-3 py-2.5"}`}>
          {showRating ? ordinalPlace : team.place}
        </td>
        <td
          className={`font-semibold ${compact ? "px-1 py-0.5 text-center text-[17px] leading-snug whitespace-nowrap" : "px-3 py-2.5"}`}
          title={compact ? team.team : undefined}
        >
          {compact ? (
            truncateTeamNameFullscreen(team.team)
          ) : team.team.length > 30 ? (
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
        <td className={`hidden sm:table-cell font-semibold ${compact ? "px-1 py-0.5 text-center whitespace-nowrap text-sm" : "px-3 py-2.5"}`}>{team.city}</td>
        <td className={`text-right font-mono font-extrabold tabular-nums ${compact ? "px-1 py-0.5 text-lg leading-none" : "px-3 py-2.5 text-base"}`}>
          {team.total}
        </td>
        {showRating && (
          <td
            className={`text-right font-mono tabular-nums text-muted ${compact ? "px-1 py-0.5 text-base leading-none" : "px-3 py-2.5 text-sm"}`}
          >
            {ratingSum}
          </td>
        )}
        {team.tours.map((tour, ti) => {
          const key = `${teamKey}::${ti}`;
          const isOpen = !!expanded[key];
          return (
            <td key={ti} className={compact ? "px-1 py-0.5 text-right" : "px-1 py-1 text-right"}>
              <button
                onClick={() => onToggle(key)}
                className={`inline-flex w-full items-center justify-end gap-1 rounded font-mono font-bold transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  compact ? "px-1.5 py-0.5" : "px-2 py-1"
                } ${isOpen ? "bg-gray-200 dark:bg-gray-700" : ""}`}
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
            className={`${stripe} border-b border-border`}
          >
            <td
              colSpan={4 + (showRating ? 1 : 0) + team.tours.length}
              className="px-4 py-3"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
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
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                          : m === false
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
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
