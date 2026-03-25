"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { ochpRatingPublicUrl } from "@/lib/ochp-seasons";

interface TourDef {
  n: number;
  q: number;
}

interface TeamRow {
  position: number;
  teamId: number;
  name: string;
  city: string;
  questionsTotal: number | null;
  mask: string | null;
  isChst: boolean;
  tourSums: number[] | null;
  cumulativeAfterTour: number[] | null;
  remainderSum: number | null;
}

interface Payload {
  tournamentId: number;
  tournamentName: string;
  tours: TourDef[];
  expectedMaskLength: number;
  extraRoundMaxLen: number;
  teams: TeamRow[];
  masksAvailable: boolean;
  docsUrl: string;
}

/** Отображаемое имя команды: не длиннее `max` символов, при обрезке хвост — «...» (входит в лимит). */
function teamNameDisplay(name: string, max = 30): string {
  if (name.length <= max) return name;
  const ellipsis = "...";
  const take = max - ellipsis.length;
  return `${name.slice(0, Math.max(0, take))}${ellipsis}`;
}

function cellDisplay(ch: string): { text: string; className: string } {
  if (ch === "1") return { text: "1", className: "text-foreground font-semibold" };
  if (ch === "0") return { text: "0", className: "text-muted/50" };
  if (ch === "-" || ch === "—") return { text: "—", className: "text-muted/40" };
  return { text: ch || "·", className: "text-amber-700 font-medium" };
}

/** Максимум очков по туру среди команд (для подсветки лидеров тура). */
function tourColumnMaxima(teams: TeamRow[], tourCount: number): (number | null)[] {
  return Array.from({ length: tourCount }, (_, ti) => {
    let max = -Infinity;
    for (const team of teams) {
      const v = team.tourSums?.[ti];
      if (typeof v === "number" && !Number.isNaN(v)) max = Math.max(max, v);
    }
    return Number.isFinite(max) ? max : null;
  });
}

export default function ChgkRatingApiResults({
  tournamentId,
  highlightTourMaxima = false,
}: {
  tournamentId: number;
  /** Подсвечивать лучший результат тура (тёмно-зелёный круг), напр. ОЧП 2023/2024 */
  highlightTourMaxima?: boolean;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<{
    teamName: string;
    tourNum: number;
    cells: string[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/ochp/rating-chgk-table?tournamentId=${encodeURIComponent(String(tournamentId))}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const openTourPopup = (team: TeamRow, tour: TourDef, tourIndex: number) => {
    if (!team.mask || !data) return;
    const slices = data.tours;
    let offset = 0;
    for (let i = 0; i < tourIndex; i++) {
      offset += slices[i]?.q ?? 0;
    }
    const cells = team.mask
      .slice(offset, offset + tour.q)
      .split("");
    while (cells.length < tour.q) cells.push("");
    setPopup({ teamName: team.name, tourNum: tour.n, cells });
  };

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-3 text-sm text-accent hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-border bg-white p-16 text-center">
        <p className="text-sm text-muted">Загрузка таблицы рейтинга…</p>
      </div>
    );
  }

  if (!data) return null;

  const showExtraCol = data.extraRoundMaxLen > 0;
  const tourMaxes =
    highlightTourMaxima && data.masksAvailable
      ? tourColumnMaxima(data.teams, data.tours.length)
      : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted leading-relaxed">
        Данные:{" "}
        <a
          href={data.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline inline-flex items-center gap-0.5"
        >
          GET /tournaments/{"{"}id{"}"}/results
          <ExternalLink className="h-3 w-3" />
        </a>
        . Повопросная строка — поле <span className="font-mono">mask</span>{" "}
        (запрашивается с{" "}
        <span className="font-mono">includeMasksAndControversials=1</span>); раскладка
        по турам — <span className="font-mono">questionQty</span> турнира.
      </p>

      {!data.masksAvailable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Повопросная сетка недоступна</p>
          <p className="mt-1 text-amber-800/90">
            В ответе API нет осмысленного поля{" "}
            <code className="text-xs bg-amber-100/80 px-1 rounded">mask</code>
            . Для идущих турниров рейтинг до наступления{" "}
            <code className="text-xs bg-amber-100/80 px-1 rounded">hideResultsTo</code>{" "}
            может не отдавать маску и часть полей даже с корректным запросом — см. описание
            операции в документации API.
          </p>
        </div>
      )}

      {data.masksAvailable && (
        <p className="text-xs text-muted">
          В ячейках тура показано число взятых вопросов; клик — повопросно. Символ, отличный
          от 0/1, отображается как снятый/особый (как «X» на сайте рейтинга).
          {highlightTourMaxima
            ? " Лучший результат тура (или ничья за 1-е место в туре) — тёмно-зелёный круг с белой цифрой."
            : null}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <a
          href={ochpRatingPublicUrl(tournamentId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          {data.tournamentName} на rating.chgk.info{" "}
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          type="button"
          onClick={() => load()}
          className="text-xs text-muted hover:text-foreground"
        >
          Обновить
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="text-sm border-collapse min-w-max">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="px-1.5 sm:px-2 py-2.5 text-right font-medium w-10">
                М
              </th>
              <th className="px-1.5 sm:px-2 py-2.5 text-right font-medium w-14">
                ID
              </th>
              <th className="px-1.5 sm:px-2 py-2.5 text-left font-medium min-w-[140px]">
                Команда
              </th>
              <th
                className="px-1 w-9 text-center text-[10px] font-medium normal-case"
                title="Зачёт ЧСт"
              >
                ЧСт
              </th>
              <th className="px-1.5 sm:px-2 py-2.5 text-left font-medium min-w-[100px]">
                Город
              </th>
              <th className="px-1.5 sm:px-2 py-2.5 text-center font-medium w-10 bg-surface/50">
                Σ
              </th>
              {data.tours.map((t) => (
                <th
                  key={t.n}
                  className="px-1.5 sm:px-2 py-2.5 text-center font-medium w-11"
                >
                  Т{t.n}
                </th>
              ))}
              {showExtraCol && (
                <th className="px-1.5 sm:px-2 py-2.5 text-center font-medium w-10">
                  П1
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.teams.map((team) => (
              <tr key={team.teamId} className="hover:bg-surface/50">
                <td className="px-1.5 sm:px-2 py-1.5 text-right text-muted font-mono text-xs">
                  {team.position}
                </td>
                <td className="px-1.5 sm:px-2 py-1.5 text-right font-mono text-xs text-muted">
                  {team.teamId}
                </td>
                <td className="px-1.5 sm:px-2 py-1.5 align-top">
                  <a
                    href={`https://rating.chgk.info/teams/${team.teamId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={team.name}
                    className="font-medium text-sm leading-tight text-accent hover:underline min-w-0 break-words"
                  >
                    {teamNameDisplay(team.name)}
                  </a>
                </td>
                <td className="px-0.5 py-1.5 text-center">
                  {team.isChst ? (
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full border border-border overflow-hidden mx-auto"
                      title="Зачёт ЧСт"
                    >
                      <span className="block w-full h-1/2 bg-white" />
                      <span className="block w-full h-1/2 bg-red-500" />
                    </span>
                  ) : null}
                </td>
                <td className="px-1.5 sm:px-2 py-1.5 text-xs text-muted whitespace-nowrap">
                  {team.city}
                </td>
                <td className="px-1.5 sm:px-2 py-1.5 text-center font-mono text-sm font-bold tabular-nums bg-surface/50">
                  {team.questionsTotal ?? "—"}
                </td>
                {data.tours.map((t, ti) => {
                  const sum = team.tourSums?.[ti];
                  const clickable =
                    data.masksAvailable && team.mask && sum != null;
                  const colMax = tourMaxes?.[ti];
                  const isTourBest =
                    sum != null &&
                    colMax != null &&
                    sum === colMax;
                  return (
                    <td
                      key={t.n}
                      className={`px-1.5 sm:px-2 py-1.5 text-center font-mono text-xs tabular-nums ${
                        clickable
                          ? `cursor-pointer hover:bg-accent/10 ${
                              isTourBest
                                ? ""
                                : "underline decoration-dotted"
                            }`
                          : ""
                      }`}
                      onClick={() =>
                        clickable ? openTourPopup(team, t, ti) : undefined
                      }
                      title={
                        clickable
                          ? "Показать вопросы тура"
                          : team.cumulativeAfterTour?.[ti] != null
                            ? `Σ после тура: ${team.cumulativeAfterTour[ti]}`
                            : undefined
                      }
                    >
                      {sum != null ? (
                        isTourBest ? (
                          <span
                            className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-emerald-900 px-1.5 font-bold text-white tabular-nums shadow-sm"
                            title={`Максимум тура Т${t.n}: ${colMax}`}
                          >
                            {sum}
                          </span>
                        ) : (
                          sum
                        )
                      ) : (
                        <span className="text-muted/40">—</span>
                      )}
                    </td>
                  );
                })}
                {showExtraCol && (
                  <td className="px-1.5 sm:px-2 py-1.5 text-center font-mono text-xs">
                    {team.remainderSum != null ? team.remainderSum : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chgk-tour-popup-title"
          onClick={() => setPopup(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-xl border border-border bg-white shadow-lg p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPopup(null)}
              className="absolute right-3 top-3 p-1 rounded-md text-muted hover:bg-surface hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
            <h3
              id="chgk-tour-popup-title"
              className="text-sm font-bold pr-8 mb-1"
            >
              {popup.teamName}
            </h3>
            <p className="text-xs text-muted mb-4">
              Тур {popup.tourNum}: взято{" "}
              {popup.cells.filter((c) => c === "1").length} из{" "}
              {popup.cells.length}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {popup.cells.map((ch, i) => {
                const { text, className } = cellDisplay(ch);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-0.5 w-9 shrink-0"
                  >
                    <span className="text-[10px] text-muted tabular-nums">
                      {i + 1}
                    </span>
                    <span
                      className={`w-full text-center rounded border border-border py-1 font-mono text-xs ${className}`}
                    >
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
