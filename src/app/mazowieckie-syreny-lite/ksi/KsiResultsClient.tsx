"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, X } from "lucide-react";
import type { SyrenyLiteKsiData, SyrenyLiteKsiTeam } from "@/lib/parsers/syreny-lite-ksi";
import { SYRENY_LITE_KSI } from "@/lib/syreny-lite";

interface Popup {
  team: SyrenyLiteKsiTeam;
  topicIdx: number;
  x: number;
  y: number;
}

function formatSign(value: 1 | -1 | null): string {
  if (value === 1) return "+";
  if (value === -1) return "−";
  return "—";
}

export function KsiResultsClient() {
  const [data, setData] = useState<SyrenyLiteKsiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    fetch("/api/syreny-lite/ksi", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Ошибка загрузки");
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  function handleTopicClick(
    e: React.MouseEvent,
    team: SyrenyLiteKsiTeam,
    topicIdx: number,
  ) {
    const topic = team.topics[topicIdx];
    const hasData = topic.questions.some((q) => q.value !== null);
    if (!hasData && topic.sum === 0) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    if (x + 140 > window.innerWidth) x = window.innerWidth - 150;
    if (x < 140) x = 150;
    if (y < 220) y = rect.bottom + 8;

    setPopup({ team, topicIdx, x, y });
  }

  const mainCount = data?.teams.filter((t) => !t.outOfCompetition).length ?? 0;
  const outCount = (data?.teams.length ?? 0) - mainCount;
  let mainPos = 0;

  return (
    <div id="page-syreny-lite-ksi" className="mx-auto max-w-[min(100%,80rem)] px-4 py-10 sm:px-6">
      <Link
        href="/mazowieckie-syreny-lite"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Syrenki Mazowieckie Lite
      </Link>

      <div id="page-syreny-lite-ksi-header" className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Результаты КСИ
        </h1>
        <p className="mt-2 text-sm text-muted">
          Командная «Своя игра» · {SYRENY_LITE_KSI.topicCount} тем
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>
              Команд: <strong className="text-foreground">{data.teams.length}</strong>
              {outCount > 0 && (
                <>
                  {" "}
                  · вне зачёта: <strong className="text-foreground">{outCount}</strong>
                </>
              )}
            </span>
            <a
              href={data.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Google Sheets <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <p className="mb-4 text-xs text-muted leading-relaxed">
            Сортировка по сумме очков. Нажмите на ячейку темы, чтобы увидеть +/− по
            вопросам (10–50). Команды «Вне зачёта» — внизу таблицы без нумерации.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="text-sm border-collapse min-w-max">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                  <th className="px-2 py-2.5 text-center font-medium w-10">#</th>
                  <th className="px-2 py-2.5 text-left font-medium min-w-[160px]">
                    Команда
                  </th>
                  <th className="px-2 py-2.5 text-center font-medium w-14 bg-surface/50">
                    Σ
                  </th>
                  {Array.from({ length: SYRENY_LITE_KSI.topicCount }, (_, i) => (
                    <th
                      key={i}
                      className="px-1.5 py-2.5 text-center font-medium w-11"
                      title={`Тема ${i + 1}`}
                    >
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.teams.map((team) => {
                  const showPos = !team.outOfCompetition;
                  if (showPos) mainPos += 1;
                  return (
                    <tr
                      key={team.name}
                      className={
                        team.outOfCompetition
                          ? "bg-zinc-50/80 text-muted"
                          : "hover:bg-surface/50"
                      }
                    >
                      <td className="px-2 py-1.5 text-center font-mono text-xs text-muted">
                        {showPos ? mainPos : ""}
                      </td>
                      <td className="px-2 py-1.5 font-medium">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {team.name}
                          {team.outOfCompetition && (
                            <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                              Вне зачёта
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono text-sm font-bold tabular-nums bg-surface/50">
                        {team.total}
                      </td>
                      {team.topics.map((topic, ti) => {
                        const clickable = topic.questions.some((q) => q.value !== null);
                        return (
                          <td
                            key={ti}
                            className={`px-1.5 py-1.5 text-center font-mono text-xs tabular-nums ${
                              clickable
                                ? "cursor-pointer hover:bg-accent/10"
                                : ""
                            }`}
                            onClick={
                              clickable
                                ? (e) => handleTopicClick(e, team, ti)
                                : undefined
                            }
                          >
                            {topic.sum !== 0 || clickable ? topic.sum : (
                              <span className="text-muted/40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {popup && (
        <div className="fixed inset-0 z-50" onClick={() => setPopup(null)}>
          <div
            className="absolute rounded-xl border border-border bg-surface p-4 shadow-2xl min-w-[200px]"
            style={{
              left: popup.x,
              top: popup.y,
              transform: "translate(-50%, -100%)",
              marginTop: "-8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-bold">{popup.team.name}</span>
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2 text-xs text-muted">
              Тема {popup.topicIdx + 1}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="py-1 text-left font-medium">Вопрос</th>
                  <th className="py-1 text-right font-medium">+/−</th>
                </tr>
              </thead>
              <tbody>
                {popup.team.topics[popup.topicIdx].questions.map((q) => (
                  <tr
                    key={q.cost}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-1.5 font-mono text-muted">{q.cost}</td>
                    <td
                      className={`py-1.5 text-right font-mono font-bold ${
                        q.value === 1
                          ? "text-emerald-600"
                          : q.value === -1
                            ? "text-red-500"
                            : "text-muted/50"
                      }`}
                    >
                      {formatSign(q.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="py-1.5 font-semibold">Сумма</td>
                  <td className="py-1.5 text-right font-mono font-bold">
                    {popup.team.topics[popup.topicIdx].sum}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
