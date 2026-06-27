import { Trophy } from "lucide-react";
import type { KubokResults } from "@/lib/turnirushki-kubok";

export default function KubokResultsTable({ data }: { data: KubokResults }) {
  const winner = data.players[0];
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        Кубок дружбы — индивидуальный зачёт, шесть туров.
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
              <th className="px-3 py-2 text-center w-12">М</th>
              <th className="px-3 py-2 text-left">Игрок</th>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <th key={n} className="px-2 py-2 text-right w-10">
                  Т{n}
                </th>
              ))}
              <th className="px-3 py-2 text-right w-12">Σ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.players.map((p) => (
              <tr key={p.name} className="hover:bg-surface/50">
                <td className="px-3 py-2 text-center font-mono text-xs text-muted">{p.place}</td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                {p.tours.map((s, i) => (
                  <td key={i} className="px-2 py-2 text-right font-mono tabular-nums">
                    {s}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                  {p.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
