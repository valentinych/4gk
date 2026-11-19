"use client";

import { Fragment, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { OchbSiBoard as Board, OchbSiTopic } from "@/lib/ochb-si";

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
  return typeof board.viewUrl === "string" && Array.isArray(board.teams) && Array.isArray(board.topicNames);
}

function topicLabel(name: string): string {
  const match = /^Round\s+(\d+)$/i.exec(name.trim());
  return match ? match[1] : name;
}

/** Real places stay as written. Rank 0, blank, and missing are not a place. */
function rankLabel(rank: string): string {
  const t = rank.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(t)) return "—";
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "—";
  return t;
}

function markClass(value: string): string {
  const v = value.trim();
  if (!v) return "text-muted/50";
  if (v.startsWith("+")) return "font-bold text-emerald-600";
  if (v.startsWith("-") || v.startsWith("−") || v.startsWith("–")) {
    return "font-bold text-red-500";
  }
  return "font-bold";
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

function TopicMarks({ topic, onClose }: { topic: OchbSiTopic; onClose: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
      <span className="text-sm font-semibold">{topic.name}</span>
      <table className="text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="px-2 py-1 text-left font-medium">Вопрос</th>
            <th className="px-2 py-1 text-right font-medium">+/−</th>
          </tr>
        </thead>
        <tbody>
          {topic.marks.map((mark) => (
            <tr key={mark.label} className="border-t border-border/60">
              <td className="px-2 py-1 font-mono text-muted">{mark.label}</td>
              <td className={`px-2 py-1 text-right font-mono ${markClass(mark.value)}`}>
                {mark.value || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="text-sm">
        Сумма{" "}
        <span className="font-mono font-bold tabular-nums">{topic.sum || "—"}</span>
      </span>
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-accent hover:underline"
      >
        Закрыть
      </button>
    </div>
  );
}

export function OchbSiBoard({ board: initialBoard }: { board: Board }) {
  const [board, setBoard] = useState(initialBoard);
  const [open, setOpen] = useState<{ team: string; topic: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const colCount = 2 + (board.sumHeader ? 1 : 0) + board.topicNames.length;

  useEffect(() => {
    let cancelled = false;
    let left = REFRESH_SECONDS;
    let refreshing = false;

    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const res = await fetch("/api/ochb/si", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: unknown = await res.json();
        if (!isBoard(data)) throw new Error("bad payload");
        if (cancelled) return;
        setBoard(data);
        setRefreshFailed(false);
        setOpen((cur) => {
          if (!cur) return null;
          const team = data.teams.find((item) => item.name === cur.team);
          const topic = team?.topics.find((item) => item.name === cur.topic);
          return topic ? cur : null;
        });
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

  function toggle(team: string, topic: string) {
    setOpen((cur) =>
      cur && cur.team === team && cur.topic === topic ? null : { team, topic },
    );
  }

  return (
    <div id="page-ochb-results-si" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted">
            Нажмите на сумму темы, чтобы увидеть плюсы и минусы по вопросам.
            Повторное нажатие скрывает их.
          </p>
          <p className="text-sm text-muted tabular-nums">
            Обновление через {countdownLabel(secondsLeft)}
            {refreshFailed ? " · не удалось" : ""}
          </p>
        </div>
        <SheetLink href={board.viewUrl} />
      </div>

      {board.teams.length === 0 ? (
        <p className="text-sm text-muted">Пока нет результатов</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-2.5 py-2.5 text-center font-medium">
                  {board.rankHeader}
                </th>
                <th scope="col" className="px-2.5 py-2.5 text-left font-medium min-w-[10rem]">
                  {board.teamHeader}
                </th>
                {board.sumHeader ? (
                  <th scope="col" className="px-2.5 py-2.5 text-center font-medium">
                    {board.sumHeader}
                  </th>
                ) : null}
                {board.topicNames.map((name) => (
                  <th
                    key={name}
                    scope="col"
                    title={name}
                    className="px-1.5 py-2.5 text-center font-medium"
                  >
                    {topicLabel(name)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {board.teams.map((team) => {
                const opened =
                  open?.team === team.name
                    ? (team.topics.find((topic) => topic.name === open.topic) ?? null)
                    : null;
                return (
                  <Fragment key={team.name}>
                    <tr data-rank={team.rank} data-team={team.name} className="hover:bg-surface/50">
                      <td className="px-2.5 py-1.5 text-center font-mono text-xs tabular-nums text-muted">
                        {rankLabel(team.rank)}
                      </td>
                      <td className="px-2.5 py-1.5 text-left font-medium whitespace-nowrap">
                        {team.name}
                      </td>
                      {board.sumHeader ? (
                        <td className="px-2.5 py-1.5 text-center font-mono text-xs font-bold tabular-nums">
                          {team.sum || "—"}
                        </td>
                      ) : null}
                      {team.topics.map((topic) => {
                        const isOpen = open?.team === team.name && open.topic === topic.name;
                        return (
                          <td key={topic.name} className="p-0">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              title={topic.name}
                              data-topic={topic.name}
                              onClick={() => toggle(team.name, topic.name)}
                              className={`w-full cursor-pointer px-1.5 py-1.5 text-center font-mono text-xs tabular-nums hover:bg-accent/10 ${
                                isOpen ? "bg-accent/15 font-semibold" : ""
                              }`}
                            >
                              {topic.sum || "—"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                    {opened ? (
                      <tr className="bg-surface/80">
                        <td colSpan={colCount} className="border-t border-border">
                          <TopicMarks topic={opened} onClose={() => setOpen(null)} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
