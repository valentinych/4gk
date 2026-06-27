import { Trophy } from "lucide-react";
import type { EkResults } from "@/lib/turnirushki-ek";

function Score({ value }: { value: number }) {
  if (value < 0) {
    return <span className="font-mono font-medium text-red-600 tabular-nums">{value}</span>;
  }
  return <span className="font-mono tabular-nums">{value}</span>;
}

function StageTable({
  teams,
  showBracket = false,
  showKsi = false,
}: {
  teams: { name: string; score: number; place: number; bracket?: string; ksi?: number }[];
  showBracket?: boolean;
  showKsi?: boolean;
}) {
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
          <th className="px-3 py-2 text-center w-10">М</th>
          {showKsi && <th className="px-3 py-2 text-center w-14">КСИ</th>}
          {showBracket && <th className="px-3 py-2 text-center w-12">Сетка</th>}
          <th className="px-3 py-2 text-left">Команда</th>
          <th className="px-3 py-2 text-right w-20">Очки</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {[...teams]
          .sort((a, b) => a.place - b.place)
          .map((t) => (
            <tr key={`${t.name}-${t.place}`} className="hover:bg-surface/50">
              <td className="px-3 py-2 text-center font-mono text-xs text-muted">{t.place}</td>
              {showKsi && (
                <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                  {t.ksi ?? "—"}
                </td>
              )}
              {showBracket && (
                <td className="px-3 py-2 text-center font-mono text-xs font-semibold text-accent">
                  {t.bracket ?? "—"}
                </td>
              )}
              <td className="px-3 py-2 font-medium">{t.name}</td>
              <td className="px-3 py-2 text-right">
                <Score value={t.score} />
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default function EkResultsTable({ data }: { data: EkResults }) {
  const winner = data.final.teams.find((t) => t.place === 1);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        Плей-офф на 16 команд с посевом по итогам {data.seedSource}. Четвертьфиналы — 4
        группы по 4 команды, затем 2 полуфинала и финал на 4 команды.
      </p>

      {winner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Trophy className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">{winner.name}</p>
          <p className="mt-1 text-sm text-muted">
            {winner.score} очков в финале
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold">Финал</h2>
        <p className="mb-3 text-xs text-muted">{data.final.venue}</p>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <StageTable teams={data.final.teams} />
        </div>
      </section>

      {data.semifinals.map((sf) => (
        <section key={sf.number}>
          <h2 className="mb-3 text-base font-bold">{sf.label}</h2>
          <p className="mb-3 text-xs text-muted">{sf.venue}</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <StageTable teams={sf.teams} showBracket />
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-4 text-base font-bold">Четвертьфиналы</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.quarterfinals.map((qf) => (
            <div key={qf.group} className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="border-b border-border bg-muted/15 px-4 py-3">
                <h3 className="text-sm font-bold">{qf.label}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {qf.venue} · {qf.host}
                </p>
              </div>
              <StageTable teams={qf.teams} showBracket showKsi />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold">Посев по {data.seedSource}</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 text-center w-14">КСИ</th>
                <th className="px-3 py-2 text-left">Команда</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.seeds.map((s) => (
                <tr key={s.ksi} className="hover:bg-surface/50">
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted">{s.ksi}</td>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
