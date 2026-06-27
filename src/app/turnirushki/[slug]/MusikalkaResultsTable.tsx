import { Trophy } from "lucide-react";
import type { MusikalkaResults } from "@/lib/turnirushki-musikalka";

export default function MusikalkaResultsTable({ data }: { data: MusikalkaResults }) {
  const winner = data.teams[0];
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        Музыкальная «Своя игра» по командам: три блока вопросов, посев по итогам ЧГК.
      </p>
      {winner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Trophy className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
          </div>
          <p className="mt-2 text-xl font-bold">{winner.name}</p>
          <p className="mt-1 text-sm text-muted">{winner.total} очков</p>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 text-center w-10">М</th>
              <th className="px-3 py-2 text-left">Команда</th>
              {data.blockLabels.map((b) => (
                <th key={b} className="px-3 py-2 text-right w-16">
                  {b}
                </th>
              ))}
              <th className="px-3 py-2 text-right w-16">Итог</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.teams.map((t) => (
              <tr key={t.name} className="hover:bg-surface/50">
                <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                  {t.place ?? "—"}
                </td>
                <td className="px-3 py-2 font-medium">{t.name}</td>
                {t.blocks.map((b, i) => (
                  <td key={i} className="px-3 py-2 text-right font-mono tabular-nums">
                    {b}
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
