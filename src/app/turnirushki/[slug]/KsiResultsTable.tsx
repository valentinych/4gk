import { ExternalLink } from "lucide-react";
import type { KsiResults, KsiTeam } from "@/lib/turnirushki-ksi";

function teamNameDisplay(name: string, max = 32): string {
  if (name.length <= max) return name;
  const ellipsis = "…";
  return `${name.slice(0, Math.max(0, max - 1))}${ellipsis}`;
}

function questionColumnMaxima(teams: KsiTeam[], qCount: number): (number | null)[] {
  return Array.from({ length: qCount }, (_, qi) => {
    let max = -Infinity;
    for (const t of teams) {
      const v = t.scores[qi];
      if (typeof v === "number") max = Math.max(max, v);
    }
    return Number.isFinite(max) ? max : null;
  });
}

function ScoreCell({ value, isBest }: { value: number | undefined; isBest: boolean }) {
  if (value == null) {
    return <span className="text-muted/40">—</span>;
  }
  if (isBest) {
    return (
      <span
        className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-emerald-900 px-1.5 font-bold text-white tabular-nums shadow-sm"
        title={`Максимум за вопрос: ${value}`}
      >
        {value}
      </span>
    );
  }
  if (value < 0) {
    return <span className="text-red-600 font-medium">{value}</span>;
  }
  if (value === 0) {
    return <span className="text-muted/50">0</span>;
  }
  return <span>{value}</span>;
}

export default function KsiResultsTable({ data }: { data: KsiResults }) {
  const qCount = data.questionCount;
  const colMax = questionColumnMaxima(data.teams, qCount);
  const legionnaireCount = data.teams.filter((t) => t.legionnaire).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Команд: <strong>{data.teams.length}</strong>
          {legionnaireCount > 0 && (
            <>
              {" "}· легионеров: <strong>{legionnaireCount}</strong>
            </>
          )}{" "}· вопросов: <strong>{qCount}</strong>
        </p>
        <a
          href={data.source}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Источник: Google Sheets <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        В каждой ячейке — заработанные очки за вопрос. Лучший результат за вопрос
        выделен тёмно-зелёным кружком. Отрицательные значения подсвечены красным.
        «Л» — команда играла как легионер.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="text-sm border-collapse min-w-max">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="px-1.5 sm:px-2 py-2.5 text-right font-medium w-10">М</th>
              <th className="px-1.5 sm:px-2 py-2.5 text-right font-medium w-12">№</th>
              <th className="px-1.5 sm:px-2 py-2.5 text-left font-medium min-w-[180px]">
                Команда
              </th>
              <th className="px-1.5 sm:px-2 py-2.5 text-left font-medium min-w-[120px]">
                Представляет
              </th>
              <th className="px-1.5 sm:px-2 py-2.5 text-center font-medium w-14 bg-surface/50">
                Σ
              </th>
              {Array.from({ length: qCount }, (_, i) => (
                <th
                  key={i}
                  className="px-1.5 sm:px-2 py-2.5 text-center font-medium w-11"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.teams.map((t) => (
              <tr key={t.number} className="hover:bg-surface/50">
                <td className="px-1.5 sm:px-2 py-1.5 text-right text-muted font-mono text-xs">
                  {t.position}
                </td>
                <td className="px-1.5 sm:px-2 py-1.5 text-right font-mono text-xs text-muted">
                  {t.number}
                </td>
                <td className="px-1.5 sm:px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-medium text-sm leading-tight min-w-0 break-words"
                      title={t.name}
                    >
                      {teamNameDisplay(t.name)}
                    </span>
                    {t.legionnaire && (
                      <span
                        className="inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100"
                        title="Легионер"
                      >
                        Л
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-1.5 sm:px-2 py-1.5 text-xs text-muted whitespace-nowrap">
                  {t.region}
                </td>
                <td className="px-1.5 sm:px-2 py-1.5 text-center font-mono text-sm font-bold tabular-nums bg-surface/50">
                  {t.total}
                  {t.tiebreaker && (
                    <div className="mt-0.5 text-[10px] font-normal text-muted/70 normal-nums">
                      {t.tiebreaker}
                    </div>
                  )}
                </td>
                {Array.from({ length: qCount }, (_, qi) => {
                  const v = t.scores[qi];
                  const isBest =
                    v != null && colMax[qi] != null && v === colMax[qi];
                  return (
                    <td
                      key={qi}
                      className="px-1.5 sm:px-2 py-1.5 text-center font-mono text-xs tabular-nums"
                    >
                      <ScoreCell value={v} isBest={isBest} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
