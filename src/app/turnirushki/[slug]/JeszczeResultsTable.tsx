import { Trophy } from "lucide-react";
import type { JeszczeResults } from "@/lib/turnirushki-jeszcze";

export default function JeszczeResultsTable({ data }: { data: JeszczeResults }) {
  const winner = data.teams.find((t) => t.place === 1);
  const roundCount = Math.max(0, ...data.teams.map((t) => t.rounds.length));

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        Jeszcze żyjemy — круговой турнир с матрицей результатов по раундам.
      </p>
      {winner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Trophy className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
          </div>
          <p className="mt-2 text-xl font-bold">{winner.name}</p>
          <p className="mt-1 text-sm text-muted">
            {winner.city} · {winner.total} очков
          </p>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 text-center w-10">М</th>
              <th className="px-3 py-2 text-left">Команда</th>
              <th className="px-3 py-2 text-left">Город</th>
              {Array.from({ length: roundCount }, (_, i) => (
                <th key={i} className="px-2 py-2 text-center w-8">
                  {i + 1}
                </th>
              ))}
              <th className="px-3 py-2 text-right w-12">Σ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.teams.map((t) => (
              <tr key={t.number} className="hover:bg-surface/50">
                <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                  {t.place || "—"}
                </td>
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2 text-xs text-muted">{t.city}</td>
                {Array.from({ length: roundCount }, (_, i) => (
                  <td key={i} className="px-2 py-2 text-center font-mono text-xs tabular-nums">
                    {t.rounds[i] == null ? "—" : t.rounds[i]}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                  {t.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
