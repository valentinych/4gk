import { Trophy } from "lucide-react";
import type { OlympResults } from "@/lib/turnirushki-olymp";

export default function OlympResultsTable({ data }: { data: OlympResults }) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        Олимпийский кубок ЧГК: восемь групп, три тура в каждой.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.groups.map((g) => (
          <div key={g.id} className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="border-b border-border bg-muted/15 px-4 py-2.5 text-sm font-semibold">
              {g.label}
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 text-center w-10">М</th>
                  <th className="px-3 py-2 text-left">Команда</th>
                  <th className="px-3 py-2 text-right w-12">Т1+2</th>
                  <th className="px-3 py-2 text-right w-10">Т3</th>
                  <th className="px-3 py-2 text-right w-10">Т4</th>
                  <th className="px-3 py-2 text-right w-12">Σ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {g.teams.map((t) => (
                  <tr key={t.name} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                      {t.place}
                    </td>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    {t.tours.map((s, i) => (
                      <td key={i} className="px-3 py-2 text-right font-mono tabular-nums">
                        {s}
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
        ))}
      </div>
    </div>
  );
}
