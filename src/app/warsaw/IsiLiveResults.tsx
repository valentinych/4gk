"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw, X as XIcon } from "lucide-react";
import type { PocBout, PocCrossCell, PocRow } from "@/lib/parsers/poc-calculator";
import type { IsiFight, IsiLeagueTable, IsiLiveData, IsiPack } from "@/lib/warsaw-isi-live";
import { WARSAW_ISI_REFRESH_SECONDS } from "@/lib/warsaw-seasons";

const REFRESH_INTERVAL = WARSAW_ISI_REFRESH_SECONDS;

function isNumericCell(value: string): boolean {
  const compact = value.trim().replace(/[\s\u00A0\u202F]/g, "").replace(",", ".");
  if (!compact) return false;
  return /^-?\d+(\.\d+)?$/.test(compact);
}

export function IsiLiveResults() {
  const [data, setData] = useState<IsiLiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/warsaw/isi-live");
      const json = (await res.json()) as IsiLiveData & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Не удалось загрузить таблицу");
      }
      setData({
        leagues: json.leagues ?? [],
        packs: json.packs ?? [],
        poc: json.poc ?? [],
        pocIncludesTour5: json.pocIncludesTour5 ?? false,
        crossPlayers: json.crossPlayers ?? [],
        crossTable: json.crossTable ?? {},
        currentSeasonTourNames: json.currentSeasonTourNames ?? [],
        countedTourNames: json.countedTourNames ?? [],
      });
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить таблицу");
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
          type="button"
          onClick={() => fetchData().then(scheduleNextRefresh)}
          className="mt-3 text-sm text-accent hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div id="page-warsaw-isi-live" className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">Тур 5 · 2026/2027</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 border border-border">
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
              Обновлено: {updatedAt.toLocaleTimeString("ru", { timeZone: "Europe/Warsaw" })}
            </span>
          )}
        </div>
      </div>

      {!data ? (
        <div className="rounded-xl border border-border bg-surface p-16 text-center">
          <RefreshCw className="h-6 w-6 text-muted animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Загрузка таблицы...</p>
        </div>
      ) : (
        <>
          {data.leagues.map((league) => (
            <LeagueTable key={league.id} league={league} />
          ))}
          <PocSection rows={data.poc} includesTour5={data.pocIncludesTour5} />
          {data.crossPlayers.length > 0 ? (
            <CrossTableSection
              players={data.crossPlayers}
              crossTable={data.crossTable}
              currentSeasonTourNames={data.currentSeasonTourNames}
              countedTourNames={data.countedTourNames}
              includesTour5={data.pocIncludesTour5}
            />
          ) : null}
          <PacksSection packs={data.packs} />
        </>
      )}
    </div>
  );
}

function LeagueTable({ league }: { league: IsiLeagueTable }) {
  const colCount = Math.max(
    league.headers.length,
    ...league.rows.map((r) => r.length),
    0,
  );
  const empty = colCount === 0;
  const nameCol = league.headers.findIndex((h) => h.trim() === "Игрок");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{league.title}</h3>
        {league.viewUrl ? (
          <a
            href={league.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Google Sheets <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      {league.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{league.error}</p>
        </div>
      ) : empty ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-muted">Скоро</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                {Array.from({ length: colCount }, (_, i) => (
                  <th
                    key={i}
                    className={`px-2 py-2.5 font-medium ${i === 0 || i === nameCol ? "text-left" : "text-center"}`}
                  >
                    {league.headers[i] ?? ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {league.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-surface/50">
                  {Array.from({ length: colCount }, (_, ci) => {
                    const value = row[ci] ?? "";
                    const numeric = isNumericCell(value);
                    return (
                      <td
                        key={ci}
                        className={`px-2 py-1.5 ${
                          ci === nameCol && !numeric
                            ? "font-medium whitespace-nowrap"
                            : numeric
                              ? "text-center font-mono text-xs tabular-nums"
                              : ""
                        }`}
                      >
                        {value || (numeric ? "" : <span className="text-muted/30">—</span>)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PocSection({ rows, includesTour5 }: { rows: PocRow[]; includesTour5: boolean }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-bold">Рейтинг POC</h3>
      {rows.length > 0 ? (
        <p className="mb-3 text-xs text-muted">
          {includesTour5
            ? "Туры 2–4 (2025/26) и начавшиеся бои тура 5"
            : "Туры 2–4 сезона 2025/26. Тур 5 добавится после первого ненулевого счёта."}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-muted">Скоро</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                <th className="px-3 py-2.5 text-left font-medium w-10">№</th>
                <th className="px-3 py-2.5 text-left font-medium min-w-[160px]">Игрок</th>
                <th className="px-3 py-2.5 text-right font-medium w-16">POC</th>
                <th className="px-3 py-2.5 text-right font-medium w-14">SOS</th>
                <th className="px-3 py-2.5 text-right font-medium w-10">В</th>
                <th className="px-3 py-2.5 text-right font-medium w-10">Н</th>
                <th className="px-3 py-2.5 text-right font-medium w-10">П</th>
                <th className="px-3 py-2.5 text-right font-medium w-10">И</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.name} className="hover:bg-surface/50">
                  <td className="px-3 py-2.5 font-bold text-muted">{row.pos}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.name}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold">{row.poc}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted text-xs">{row.sos}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-green-600">{row.w}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-amber-600">{row.d}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500">{row.l}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted">{row.g}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function countedBouts(cell: PocCrossCell, countedNames: Set<string>): PocBout[] {
  return cell.bouts.filter((b) => countedNames.has(b.tourName));
}

function countedPairScore(cell: PocCrossCell, countedNames: Set<string>): { winsA: number; winsB: number } {
  let winsA = 0;
  let winsB = 0;
  for (const bout of countedBouts(cell, countedNames)) {
    if (bout.scoreA > bout.scoreB) winsA++;
    else if (bout.scoreA < bout.scoreB) winsB++;
  }
  return { winsA, winsB };
}

function cellFromRowView(
  pA: string,
  pB: string,
  crossTable: Record<string, PocCrossCell>,
): PocCrossCell | null {
  const direct = crossTable[`${pA}|||${pB}`];
  if (direct) return direct;
  const rev = crossTable[`${pB}|||${pA}`];
  if (!rev) return null;
  return {
    ...rev,
    winsA: rev.winsB,
    winsB: rev.winsA,
    bouts: rev.bouts.map((b) => ({ ...b, scoreA: b.scoreB, scoreB: b.scoreA })),
  };
}

function CrossTableSection({
  players,
  crossTable,
  currentSeasonTourNames,
  countedTourNames,
  includesTour5,
}: {
  players: string[];
  crossTable: Record<string, PocCrossCell>;
  currentSeasonTourNames: string[];
  countedTourNames: string[];
  includesTour5: boolean;
}) {
  const [popup, setPopup] = useState<{
    pA: string;
    pB: string;
    cell: PocCrossCell;
    x: number;
    y: number;
  } | null>(null);

  const currentNames = new Set(currentSeasonTourNames ?? []);
  const countedNames = new Set(countedTourNames ?? []);

  function isCurrentSeason(cell: PocCrossCell): boolean {
    return cell.bouts.some((b) => currentNames.has(b.tourName));
  }

  function handleCellClick(e: React.MouseEvent, pA: string, pB: string) {
    const cell = cellFromRowView(pA, pB, crossTable);
    if (!cell || !cell.bouts.length) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    if (x + 150 > window.innerWidth) x = window.innerWidth - 160;
    if (x < 150) x = 160;
    if (y < 250) y = rect.bottom + 8;

    setPopup({ pA, pB, cell, x, y });
  }

  const popupScore = popup ? countedPairScore(popup.cell, countedNames) : null;

  return (
    <div>
      <h3 className="mb-1 text-sm font-bold">Кросс-таблица личных встреч</h3>
      <p className="mb-3 text-xs text-muted">
        {includesTour5
          ? "Подсветка — дуэли текущего сезона (тур 5). Остальные ячейки — туры 2–4 сезона 2025/26."
          : "Туры 2–4 сезона 2025/26. Подсветка дуэлей тура 5 появится после первого ненулевого счёта."}
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="text-xs whitespace-nowrap border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-1.5 py-2 text-left font-medium text-muted sticky left-0 bg-surface z-10 min-w-[28px]">
                №
              </th>
              <th className="px-2 py-2 text-left font-medium text-muted sticky left-7 bg-surface z-10 min-w-[120px]">
                Игрок
              </th>
              {players.map((_, i) => (
                <th
                  key={i}
                  className="px-1 py-2 text-center font-medium text-muted w-10"
                  title={players[i]}
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((pA, i) => (
              <tr key={pA} className="border-b border-border/50 hover:bg-surface/30">
                <td className="px-1.5 py-1.5 font-bold text-muted sticky left-0 bg-surface z-[5]">
                  {i + 1}
                </td>
                <td className="px-2 py-1.5 font-medium sticky left-7 bg-surface z-[5]" title={pA}>
                  {pA}
                </td>
                {players.map((pB, j) => {
                  if (i === j) return <td key={j} className="bg-gray-200" />;
                  const cell = cellFromRowView(pA, pB, crossTable);
                  if (!cell || !cell.bouts.length) {
                    return (
                      <td key={j} className="px-1 py-1.5 text-center text-gray-300">
                        —
                      </td>
                    );
                  }
                  const score = countedPairScore(cell, countedNames);
                  const hasCounted = countedBouts(cell, countedNames).length > 0;
                  const current = includesTour5 && isCurrentSeason(cell);
                  const muted = includesTour5 && !current;
                  const cls = !hasCounted
                    ? "text-gray-300"
                    : score.winsA > score.winsB
                      ? "text-green-600"
                      : score.winsA < score.winsB
                        ? "text-red-500"
                        : "text-amber-600";
                  return (
                    <td
                      key={j}
                      className={`px-1 py-1.5 text-center font-semibold cursor-pointer hover:bg-accent/10 ${cls}${
                        current ? " bg-accent/10" : muted ? " opacity-40" : ""
                      }`}
                      onClick={(e) => handleCellClick(e, pA, pB)}
                    >
                      {hasCounted ? `${score.winsA}:${score.winsB}` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popup ? (
        <div className="fixed inset-0 z-50" onClick={() => setPopup(null)}>
          <div
            className="absolute bg-surface rounded-xl shadow-2xl border border-border p-4 min-w-[280px] max-h-[70vh] overflow-y-auto"
            style={{
              left: popup.x,
              top: popup.y,
              transform: "translate(-50%, -100%)",
              marginTop: "-8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">
                {popup.pA} — {popup.pB}
              </span>
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="text-muted hover:text-foreground ml-3"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center text-xl font-bold text-foreground mb-3">
              {popupScore ? `${popupScore.winsA} : ${popupScore.winsB}` : null}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="py-1 text-left font-medium">Тур</th>
                  <th className="py-1 text-center font-medium">Результат</th>
                  <th className="py-1 text-right font-medium">Счёт</th>
                </tr>
              </thead>
              <tbody>
                {popup.cell.bouts.map((bout, idx) => {
                  const isWin = bout.scoreA > bout.scoreB;
                  const isLoss = bout.scoreA < bout.scoreB;
                  const counted = countedNames.has(bout.tourName);
                  const current = currentNames.has(bout.tourName);
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-border/50 last:border-0${
                        !counted
                          ? " bg-muted/50"
                          : current
                            ? " bg-accent/10"
                            : includesTour5
                              ? " opacity-60"
                              : ""
                      }`}
                    >
                      <td className="py-1.5 text-muted text-xs">
                        {bout.tourName}, бой {bout.boutIdx}
                      </td>
                      <td
                        className={`py-1.5 text-center font-medium ${
                          isWin ? "text-green-600" : isLoss ? "text-red-500" : "text-amber-600"
                        }`}
                      >
                        {isWin ? "победа" : isLoss ? "поражение" : "ничья"}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {bout.scoreA} : {bout.scoreB}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PacksSection({ packs }: { packs: IsiPack[] }) {
  return (
    <div className="space-y-8">
      <h3 className="text-sm font-bold">Результаты пакетов</h3>
      {packs.map((pack) => (
        <PackBlock key={pack.id} pack={pack} />
      ))}
    </div>
  );
}

function PackBlock({ pack }: { pack: IsiPack }) {
  const subtitle = [pack.boutLabel, pack.time].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold">
          {pack.title}
          {subtitle ? <span className="ml-2 font-medium text-muted">{subtitle}</span> : null}
        </h4>
        {pack.viewUrl ? (
          <a
            href={pack.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Google Sheets <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      {pack.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{pack.error}</p>
        </div>
      ) : pack.fights.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-muted">Скоро</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pack.fights.map((fight, i) => (
            <FightCard key={`${pack.id}-${i}`} fight={fight} />
          ))}
        </div>
      )}
    </div>
  );
}

function FightCard({ fight }: { fight: IsiFight }) {
  const rows = fight.started
    ? [...fight.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ru"))
    : fight.players;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border bg-muted/15 px-3 py-2 text-sm font-semibold">
        {fight.room || "Бой"}
      </div>
      {!fight.started ? (
        <p className="px-3 py-1.5 text-xs text-muted">Бой не начался</p>
      ) : null}
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {rows.map((p) => (
            <tr key={p.name} className="hover:bg-surface/50">
              <td className="px-3 py-1.5 font-medium">{p.name}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">
                {fight.started ? p.score : <span className="text-muted/40">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
