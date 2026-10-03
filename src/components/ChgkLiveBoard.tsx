"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";

import {
  formatTenth,
  pragueColumnStats,
  type ChgkColumnStats,
} from "@/lib/chgk-column-stats";
import {
  lastQuestionWithAnyPlus,
  teamRatingSum,
  type PraguePayload,
  type PragueTeamRow,
} from "@/lib/prague-stats";
import { formatTrueDlHundredths } from "@/lib/truedl";

const POLL_INTERVAL_MS = 30_000;
const FULLSCREEN_PAGE_SIZE = 23;
const FULLSCREEN_FLIP_SEC = 15;
/** OCHCH results (`standingsToggles`). Other boards, including Prague, stay at 15s. */
const OCHCH_FULLSCREEN_FLIP_SEC = 30;

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

function BoardTeamMarks({ team }: { team: PragueTeamRow }) {
  if (!team.czech && !team.amateur) return null;
  return (
    <span className="inline-flex items-center justify-end gap-0.5 whitespace-nowrap">
      {team.czech ? <span title="Чешский зачёт">🇨🇿</span> : null}
      {team.amateur ? (
        <span title="Любительская команда">🟢</span>
      ) : null}
    </span>
  );
}

function BoardTeamName({
  team,
  compact,
}: {
  team: PragueTeamRow;
  compact: boolean;
}) {
  const visible = compact
    ? truncateTeamNameFullscreen(team.team)
    : team.team;
  const nameNode = team.href ? (
    <Link
      href={team.href}
      className="text-inherit hover:text-accent hover:underline"
    >
      {visible}
    </Link>
  ) : (
    visible
  );
  if (!compact && team.team.length > 30) {
    return (
      <span
        className="block text-xs leading-tight"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
        title={team.team}
      >
        {nameNode}
      </span>
    );
  }
  return nameNode;
}

type StandingsKind = "all" | "amateur" | "czech";

/** Same 1–2 / 1,1,3-style labels as the overall sheet table (ties share a range). */
function withCompetitionPlaces(teams: PragueTeamRow[]): PragueTeamRow[] {
  const out: PragueTeamRow[] = [];
  for (let i = 0; i < teams.length; ) {
    let j = i + 1;
    while (j < teams.length && teams[j].total === teams[i].total) j++;
    const label = j > i + 1 ? `${i + 1}-${j}` : `${i + 1}`;
    for (let k = i; k < j; k++) out.push({ ...teams[k], place: label });
    i = j;
  }
  return out;
}

export interface ChgkLiveBoardProps {
  apiPath: string;
  title: string;
  backHref: string;
  backLabel: string;
  sheetUrl: string;
  pageId: string;
  adminCsvHref?: string;
  /** OCHCH: любительский / чешский зачёт toggles next to rating. */
  standingsToggles?: boolean;
  /** OCHCH only: median, mean, and trueDL under Σ and each tour. */
  showQuestionStats?: boolean;
}

export function ChgkLiveBoard({
  apiPath,
  title,
  backHref,
  backLabel,
  sheetUrl,
  pageId,
  adminCsvHref,
  standingsToggles = false,
  showQuestionStats = false,
}: ChgkLiveBoardProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [data, setData] = useState<PraguePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const fitWrapRef = useRef<HTMLDivElement | null>(null);
  const fitTableRef = useRef<HTMLTableElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [showRating, setShowRating] = useState(false);
  const [standings, setStandings] = useState<StandingsKind>("all");
  const [fsPage, setFsPage] = useState(0);
  const flipSec = standingsToggles
    ? OCHCH_FULLSCREEN_FLIP_SEC
    : FULLSCREEN_FLIP_SEC;
  const [fsSecondsLeft, setFsSecondsLeft] = useState(flipSec);

  const lastQuestionEntered = useMemo(
    () => (data ? lastQuestionWithAnyPlus(data.teams, data.tours) : 0),
    [data],
  );

  const ratingByTeamKey = useMemo(() => {
    if (!data) return new Map<string, number>();
    const { teams, tours } = data;
    const m = new Map<string, number>();
    for (const t of teams) {
      m.set(`${t.team}|${t.city}`, teamRatingSum(t, teams, tours));
    }
    return m;
  }, [data]);

  const displayedTeams = useMemo(() => {
    if (!data) return [];
    if (standings === "all") return data.teams;
    const filtered = data.teams.filter((t) =>
      standings === "amateur" ? t.amateur : t.czech,
    );
    return withCompetitionPlaces(filtered);
  }, [data, standings]);

  const columnStats = useMemo(() => {
    if (!showQuestionStats || !data || displayedTeams.length === 0) return null;
    return pragueColumnStats(displayedTeams, data.tours, data.teams);
  }, [showQuestionStats, data, displayedTeams]);

  const fsPageCount = Math.max(
    1,
    Math.ceil(displayedTeams.length / FULLSCREEN_PAGE_SIZE),
  );
  const pagedTeams = fullscreen
    ? displayedTeams.slice(
        fsPage * FULLSCREEN_PAGE_SIZE,
        (fsPage + 1) * FULLSCREEN_PAGE_SIZE,
      )
    : displayedTeams;

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

  useEffect(() => {
    if (!fullscreen) {
      setFsPage(0);
      setFsSecondsLeft(flipSec);
    }
  }, [fullscreen, flipSec]);

  useEffect(() => {
    setFsPage((p) => Math.min(p, fsPageCount - 1));
  }, [fsPageCount, standings]);

  useEffect(() => {
    if (!fullscreen || fsPageCount < 2) return;
    let left = flipSec;
    setFsSecondsLeft(left);
    const id = setInterval(() => {
      if (document.hidden) return;
      left -= 1;
      if (left <= 0) {
        setFsPage((p) => (p + 1) % fsPageCount);
        left = flipSec;
      }
      setFsSecondsLeft(left);
    }, 1_000);
    return () => clearInterval(id);
  }, [fullscreen, fsPageCount, fsPage, flipSec]);

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
  }, [fullscreen, data, expanded, showRating, standings, fsPage]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(apiPath, { cache: "no-store" });
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
  }, [apiPath]);

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div id={`page-${pageId}`} className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>
      <div id={`page-${pageId}-header`} className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          Результаты обновляются автоматически каждые 30 секунд.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
          <a
            href={sheetUrl}
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
          {isAdmin && adminCsvHref && (
            <a
              href={adminCsvHref}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 font-semibold text-accent transition-colors hover:bg-surface-hover"
            >
              <Download className="h-3 w-3" />
              Скачать CSV (шаблон турниров)
            </a>
          )}
        </div>
        {data && lastQuestionEntered > 0 && (
          <p className="mt-3 text-sm font-medium text-foreground">
            После {lastQuestionEntered} вопроса
          </p>
        )}
      </div>

      {loading && !data && (
        <div
          id={`page-${pageId}-loading`}
          className="rounded-xl border border-border bg-surface p-6 text-sm text-muted"
        >
          Загрузка результатов...
        </div>
      )}

      {error && !data && (
        <div
          id={`page-${pageId}-error`}
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          Не удалось загрузить данные: {error}
        </div>
      )}

      {data && data.teams.length === 0 && (
        <div
          id={`page-${pageId}-empty`}
          className="rounded-xl border border-border bg-surface p-6 text-sm text-muted"
        >
          Нет данных о командах.
        </div>
      )}

      {data && data.teams.length > 0 && (
        <div
          id={`page-${pageId}-results`}
          className={
            fullscreen
              ? "fixed inset-0 z-50 flex flex-col bg-background p-4 sm:p-6"
              : ""
          }
        >
          <div
            id={`page-${pageId}-results-toolbar`}
            className="mb-2 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex flex-wrap items-center gap-3">
              {fullscreen && lastQuestionEntered > 0 && (
                <span className="text-sm font-medium text-foreground">
                  После {lastQuestionEntered} вопроса
                </span>
              )}
              {fullscreen && fsPageCount > 1 && (
                <span className="text-xs tabular-nums text-muted">
                  {fsPage * FULLSCREEN_PAGE_SIZE + 1}–
                  {Math.min(
                    (fsPage + 1) * FULLSCREEN_PAGE_SIZE,
                    displayedTeams.length,
                  )}{" "}
                  · {fsSecondsLeft} с
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowRating((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {showRating ? "Скрыть рейтинг" : "Показать рейтинг"}
              </button>
              {standingsToggles ? (
                <>
                  <button
                    type="button"
                    aria-pressed={standings === "amateur"}
                    onClick={() =>
                      setStandings((cur) => (cur === "amateur" ? "all" : "amateur"))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      standings === "amateur"
                        ? "border-gray-400 bg-gray-200 dark:border-gray-500 dark:bg-gray-700"
                        : "border-border bg-surface"
                    }`}
                  >
                    Любительский зачёт
                  </button>
                  <button
                    type="button"
                    aria-pressed={standings === "czech"}
                    onClick={() =>
                      setStandings((cur) => (cur === "czech" ? "all" : "czech"))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      standings === "czech"
                        ? "border-gray-400 bg-gray-200 dark:border-gray-500 dark:bg-gray-700"
                        : "border-border bg-surface"
                    }`}
                  >
                    Чешский зачёт
                  </button>
                </>
              ) : null}
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
          {displayedTeams.length === 0 ? (
            <div
              className={`rounded-xl border border-border bg-surface p-6 text-sm text-muted ${
                fullscreen ? "flex-1" : ""
              }`}
            >
              {standings === "amateur"
                ? "Нет любительских команд"
                : "Нет чешских команд"}
            </div>
          ) : (
            <div
              className={
                fullscreen
                  ? "flex min-h-0 flex-1 items-stretch gap-1"
                  : ""
              }
            >
              {fullscreen && fsPageCount > 1 ? (
                <button
                  type="button"
                  aria-label="Предыдущие команды"
                  onClick={() =>
                    setFsPage((p) => (p - 1 + fsPageCount) % fsPageCount)
                  }
                  className="shrink-0 self-center rounded-md p-1 text-muted transition-colors hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-10 w-10" />
                </button>
              ) : null}
              <div
                ref={fitWrapRef}
                className={`rounded-xl border border-border bg-surface shadow-sm ${
                  fullscreen
                    ? "flex min-h-0 flex-1 items-start justify-center overflow-hidden"
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
                        <th
                          className={`font-semibold w-12 ${fullscreen ? "px-1 py-0.5 text-center" : "px-3 py-3"}`}
                        >
                          М
                        </th>
                        <th
                          className={`font-semibold ${fullscreen ? "px-1 py-0.5 text-center text-sm" : "px-3 py-3 min-w-[180px]"}`}
                        >
                          Команда
                        </th>
                        <th
                          className={`hidden sm:table-cell font-semibold ${fullscreen ? "px-1 py-0.5 text-center" : "px-3 py-3 min-w-[120px]"}`}
                        >
                          Город
                        </th>
                        {standingsToggles ? (
                          <th
                            className={`font-semibold ${fullscreen ? "px-1 py-0.5 text-center" : "px-2 py-3"}`}
                          >
                            <span className="sr-only">Зачёты</span>
                          </th>
                        ) : null}
                        <th
                          className={`text-right font-semibold w-16 ${fullscreen ? "px-1 py-0.5 text-sm tabular-nums" : "px-3 py-3"}`}
                        >
                          Σ
                        </th>
                        {showRating && (
                          <th
                            className={`text-right font-semibold ${fullscreen ? "px-1 py-0.5 text-xs tabular-nums font-normal normal-case text-muted" : "px-3 py-3 text-xs font-normal normal-case text-muted"}`}
                          >
                            Рейтинг
                          </th>
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
                      {pagedTeams.map((team, i) => {
                        const rowIdx =
                          (fullscreen ? fsPage * FULLSCREEN_PAGE_SIZE : 0) + i;
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
                            showMarks={standingsToggles}
                            ratingSum={ratingByTeamKey.get(teamKey) ?? 0}
                            ordinalPlace={rowIdx + 1}
                          />
                        );
                      })}
                    </tbody>
                    {columnStats ? (
                      <QuestionStatsFoot
                        stats={columnStats}
                        compact={fullscreen}
                        showMarks={standingsToggles}
                        showRating={showRating}
                      />
                    ) : null}
                  </table>
                </div>
              </div>
              {fullscreen && fsPageCount > 1 ? (
                <button
                  type="button"
                  aria-label="Следующие команды"
                  onClick={() => setFsPage((p) => (p + 1) % fsPageCount)}
                  className="shrink-0 self-center rounded-md p-1 text-muted transition-colors hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
                >
                  <ChevronRight className="h-10 w-10" />
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionStatsFoot({
  stats,
  compact,
  showMarks,
  showRating,
}: {
  stats: ChgkColumnStats;
  compact: boolean;
  showMarks: boolean;
  showRating: boolean;
}) {
  const rows: Array<{ label: string; sum: string; values: string[] }> = [
    {
      label: "Медиана",
      sum: formatTenth(stats.sum.median),
      values: stats.tours.map((t) => formatTenth(t.median)),
    },
    {
      label: "Среднее",
      sum: formatTenth(stats.sum.mean),
      values: stats.tours.map((t) => formatTenth(t.mean)),
    },
    {
      label: "trueDL",
      sum: formatTrueDlHundredths(stats.sum.trueDl),
      values: stats.tours.map((t) => formatTrueDlHundredths(t.trueDl)),
    },
  ];
  const pad = compact ? "px-1 py-0.5" : "px-3 py-1.5";
  return (
    <tfoot>
      {rows.map((row) => (
        <tr
          key={row.label}
          className="border-t border-border bg-gray-50 text-muted dark:bg-gray-800/60"
        >
          <td className={`${pad} text-center font-mono text-xs`}>—</td>
          <td
            className={`${pad} font-medium text-xs ${compact ? "whitespace-nowrap text-center" : ""}`}
          >
            {row.label}
          </td>
          <td className={`hidden sm:table-cell ${pad}`} />
          {showMarks ? <td className={pad} /> : null}
          <td className={`${pad} text-right font-mono text-xs tabular-nums`}>
            {row.sum}
          </td>
          {showRating ? <td className={pad} /> : null}
          {row.values.map((value, ti) => (
            <td
              key={ti}
              className={`${pad} text-right font-mono text-xs tabular-nums`}
            >
              {value}
            </td>
          ))}
        </tr>
      ))}
    </tfoot>
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
  showMarks?: boolean;
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
  showMarks = false,
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

  const stripe =
    rowIdx % 2 === 0
      ? "bg-white dark:bg-gray-900"
      : "bg-gray-50 dark:bg-gray-800/50";

  return (
    <>
      <tr
        className={`${stripe} border-b border-border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
      >
        <td
          className={`font-extrabold whitespace-nowrap ${compact ? "px-1 py-0.5 text-center text-sm tabular-nums" : "px-3 py-2.5"}`}
        >
          {showRating ? ordinalPlace : team.place}
        </td>
        <td
          className={`font-semibold ${compact ? "px-1 py-0.5 text-center text-[17px] leading-snug whitespace-nowrap" : "px-3 py-2.5"}`}
          title={compact ? team.team : undefined}
        >
          <BoardTeamName team={team} compact={compact} />
        </td>
        <td
          className={`hidden sm:table-cell font-semibold ${compact ? "px-1 py-0.5 text-center whitespace-nowrap text-sm" : "px-3 py-2.5"}`}
        >
          {team.city}
        </td>
        {showMarks ? (
          <td
            className={`text-right leading-none ${compact ? "px-1 py-0.5" : "px-2 py-2.5"}`}
          >
            <BoardTeamMarks team={team} />
          </td>
        ) : null}
        <td
          className={`text-right font-mono font-extrabold tabular-nums ${compact ? "px-1 py-0.5 text-lg leading-none" : "px-3 py-2.5 text-base"}`}
        >
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
              colSpan={
                4 +
                (showMarks ? 1 : 0) +
                (showRating ? 1 : 0) +
                team.tours.length
              }
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
                      <span className="text-[10px] leading-none opacity-80">{qNum}</span>
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
