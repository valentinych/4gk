"use client";

import { Fragment, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { OchbSiBoard as Board, OchbSiTopic } from "@/lib/ochb-si";

function topicLabel(name: string): string {
  const match = /^Round\s+(\d+)$/i.exec(name.trim());
  return match ? match[1] : name;
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

export function OchbSiBoard({ board }: { board: Board }) {
  const [open, setOpen] = useState<{ team: number; topic: number } | null>(null);
  const colCount = 2 + (board.sumHeader ? 1 : 0) + board.topicNames.length;

  function toggle(team: number, topic: number) {
    setOpen((cur) =>
      cur && cur.team === team && cur.topic === topic ? null : { team, topic },
    );
  }

  return (
    <div id="page-ochb-results-si" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Нажмите на сумму темы, чтобы увидеть плюсы и минусы по вопросам.
          Повторное нажатие скрывает их.
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
              {board.teams.map((team, ti) => {
                const opened = open?.team === ti ? team.topics[open.topic] : null;
                return (
                  <Fragment key={`${ti}-${team.name}`}>
                    <tr data-rank={team.rank} data-team={team.name} className="hover:bg-surface/50">
                      <td className="px-2.5 py-1.5 text-center font-mono text-xs tabular-nums text-muted">
                        {team.rank || "—"}
                      </td>
                      <td className="px-2.5 py-1.5 text-left font-medium whitespace-nowrap">
                        {team.name}
                      </td>
                      {board.sumHeader ? (
                        <td className="px-2.5 py-1.5 text-center font-mono text-xs font-bold tabular-nums">
                          {team.sum || "—"}
                        </td>
                      ) : null}
                      {team.topics.map((topic, qi) => {
                        const isOpen = open?.team === ti && open.topic === qi;
                        return (
                          <td key={topic.name} className="p-0">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              title={topic.name}
                              data-topic={topic.name}
                              onClick={() => toggle(ti, qi)}
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
