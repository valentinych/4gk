"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { OchbQuizBoard as Board } from "@/lib/ochb-quiz";

const REFRESH_SECONDS = 60;

function countdownLabel(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function isBoard(data: unknown): data is Board {
  if (!data || typeof data !== "object") return false;
  const board = data as Partial<Board>;
  return typeof board.viewUrl === "string" && Array.isArray(board.teams) && Array.isArray(board.columns);
}

/** Real places stay as written. Rank 0, blank, and missing are not a place. */
function rankLabel(rank: string): string {
  const t = rank.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(t)) return "—";
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "—";
  return t;
}

function cellText(value: string): string {
  return value.trim() || "—";
}

function SheetLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
    >
      Google Sheets <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function OchbQuizBoard({ board: initialBoard }: { board: Board }) {
  const [board, setBoard] = useState(initialBoard);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let left = REFRESH_SECONDS;
    let refreshing = false;

    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const res = await fetch("/api/ochb/quiz", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: unknown = await res.json();
        if (!isBoard(data)) throw new Error("bad payload");
        if (cancelled) return;
        setBoard(data);
        setRefreshFailed(false);
      } catch {
        if (!cancelled) setRefreshFailed(true);
      } finally {
        refreshing = false;
      }
    }

    const id = window.setInterval(() => {
      left -= 1;
      if (left < 0) {
        left = REFRESH_SECONDS;
        void refresh();
      }
      if (!cancelled) setSecondsLeft(left);
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div id="page-ochb-results-quiz" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted tabular-nums">
          Обновление через {countdownLabel(secondsLeft)}
          {refreshFailed ? " · не удалось" : ""}
        </p>
        <SheetLink href={board.viewUrl} />
      </div>

      {board.teams.length === 0 ? (
        <p className="text-sm text-muted">Пока нет результатов</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                {board.rankHeader ? (
                  <th scope="col" className="px-2.5 py-2.5 text-center font-medium">
                    {board.rankHeader}
                  </th>
                ) : null}
                <th scope="col" className="px-2.5 py-2.5 text-left font-medium min-w-[10rem]">
                  {board.teamHeader}
                </th>
                {board.columns.map((name, index) => (
                  <th
                    key={`${name}-${index}`}
                    scope="col"
                    className="px-2.5 py-2.5 text-center font-medium whitespace-nowrap"
                  >
                    {name || "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {board.teams.map((team) => (
                <tr
                  key={team.order}
                  data-rank={team.rank}
                  data-team={team.name}
                  className="hover:bg-surface/50"
                >
                  {board.rankHeader ? (
                    <td className="px-2.5 py-1.5 text-center font-mono text-xs tabular-nums text-muted">
                      {rankLabel(team.rank)}
                    </td>
                  ) : null}
                  <td
                    className={`px-2.5 py-1.5 text-left whitespace-nowrap ${
                      team.name ? "font-medium" : "text-muted"
                    }`}
                  >
                    {team.name || "—"}
                  </td>
                  {team.cells.map((value, index) => {
                    const text = cellText(value);
                    const bold = index === board.totalColumn && text !== "—";
                    return (
                      <td
                        key={index}
                        className={`px-2.5 py-1.5 text-center font-mono text-xs tabular-nums ${
                          text === "—" ? "text-muted" : bold ? "font-bold" : ""
                        }`}
                      >
                        {text}
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
