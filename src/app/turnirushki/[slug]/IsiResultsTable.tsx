import { Trophy } from "lucide-react";
import type { IsiPlayoffBout, IsiResults } from "@/lib/turnirushki-isi";

function Score({ value, raw }: { value: number | null; raw?: string | null }) {
  if (raw && raw !== String(value)) {
    return <span className="font-mono tabular-nums">{raw}</span>;
  }
  if (value == null) return <span className="text-muted">—</span>;
  if (value < 0) {
    return <span className="font-mono font-medium text-red-600 tabular-nums">{value}</span>;
  }
  return <span className="font-mono tabular-nums">{value}</span>;
}

function BoutTable({ bout }: { bout: IsiPlayoffBout }) {
  const sorted = [...bout.matches].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="border-b border-border bg-muted/15 px-4 py-2.5 text-sm font-semibold">
        {bout.label}
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 text-center w-10">М</th>
            <th className="px-3 py-2 text-left">Игрок</th>
            <th className="px-3 py-2 text-right w-24">Очки</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {sorted.map((m) => (
            <tr key={m.player} className="hover:bg-surface/50">
              <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                {m.place ?? "—"}
              </td>
              <td className="px-3 py-2 font-medium">{m.player}</td>
              <td className="px-3 py-2 text-right">
                <Score value={m.score} raw={m.scoreRaw} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function boutNumber(label: string): number {
  const m = label.match(/Бой\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : 99;
}

function boutStage(n: number): string {
  if (n <= 4) return "1/8 финала";
  if (n <= 8) return "Четвертьфинал";
  if (n <= 10) return "Полуфинал";
  if (n === 11) return "Финал";
  return "Плей-офф";
}

export default function IsiResultsTable({ data }: { data: IsiResults }) {
  const finalBout = data.playoffs.bouts.find((b) => boutNumber(b.label) === 11);
  const winner = finalBout?.matches.find((m) => m.place === 1);

  const sortedBouts = [...data.playoffs.bouts].sort(
    (a, b) => boutNumber(a.label) - boutNumber(b.label),
  );

  const stages = new Map<string, IsiPlayoffBout[]>();
  for (const bout of sortedBouts) {
    const stage = boutStage(boutNumber(bout.label));
    if (!stages.has(stage)) stages.set(stage, []);
    stages.get(stage)!.push(bout);
  }

  const stageOrder = ["1/8 финала", "Четвертьфинал", "Полуфинал", "Финал", "Плей-офф"];

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        Индивидуальная Своя Игра: отбор и плей-офф на 24 игрока с посевом по итогам{" "}
        {data.seedSource}.
      </p>

      {winner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Trophy className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">{winner.player}</p>
          {winner.score != null && (
            <p className="mt-1 text-sm text-muted">{winner.scoreRaw ?? winner.score} очков в финале</p>
          )}
        </div>
      )}

      {sortedBouts.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold">Плей-офф</h2>
          <div className="space-y-6">
            {stageOrder
              .filter((s) => stages.has(s))
              .map((stage) => (
                <div key={stage}>
                  <h3 className="mb-3 text-sm font-bold text-muted">{stage}</h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {stages.get(stage)!.map((bout) => (
                      <BoutTable key={bout.label} bout={bout} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {data.playoffs.seeds.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">Посев плей-офф</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 text-center w-10">№</th>
                  <th className="px-3 py-2 text-left">Игрок</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.playoffs.seeds.map((s) => (
                  <tr key={s.place} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                      {s.place}
                    </td>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.qualification.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">Отбор</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 text-center w-10">М</th>
                  <th className="px-3 py-2 text-left">Игрок</th>
                  <th className="px-3 py-2 text-right w-20">Итого</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.qualification.map((p) => (
                  <tr key={p.place} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                      {p.place}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {p.name}
                      {p.note && (
                        <span className="ml-2 text-xs text-muted">({p.note})</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Score value={p.total} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
