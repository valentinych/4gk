import { Trophy } from "lucide-react";
import type { TroikaPlayoffBout, TroikaPlayoffMatch, TroikaResults } from "@/lib/turnirushki-troika";

function Score({ value }: { value: number }) {
  return <span className="font-mono tabular-nums">{value}</span>;
}

function pairMatches(matches: TroikaPlayoffMatch[]) {
  const pairs: [TroikaPlayoffMatch, TroikaPlayoffMatch | undefined][] = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push([matches[i], matches[i + 1]]);
  }
  return pairs;
}

function PlayoffBout({ bout }: { bout: TroikaPlayoffBout }) {
  const pairs = pairMatches(bout.matches);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="border-b border-border bg-muted/15 px-4 py-2.5 text-sm font-semibold">
        {bout.label}
      </div>
      <ul className="divide-y divide-border/60 text-sm">
        {pairs.map(([a, b], idx) => (
          <li key={idx} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5">
            {a.seed != null && (
              <span className="font-mono text-xs text-muted">{a.seed}</span>
            )}
            <span className="font-medium">{a.team}</span>
            <span className="font-mono font-bold tabular-nums">{a.score}</span>
            {b && (
              <>
                <span className="text-muted">:</span>
                <span className="font-mono font-bold tabular-nums">{b.score}</span>
                <span className="font-medium">{b.team}</span>
                {b.seed != null && (
                  <span className="font-mono text-xs text-muted">{b.seed}</span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function boutSortKey(label: string): number {
  const special: Record<string, number> = {
    "полуфинал 1": 90,
    "полуфинал 2": 91,
    "финал": 92,
    "бой за 3 место": 93,
  };
  const lower = label.toLowerCase();
  for (const [key, val] of Object.entries(special)) {
    if (lower.includes(key)) return val;
  }
  const m = label.match(/бой\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : 99;
}

function stageLabel(key: number): string {
  if (key <= 8) return "Бои 1–8";
  if (key <= 16) return "Бои 9–16";
  if (key <= 20) return "Бои 17–20";
  if (key === 90 || key === 91) return "Полуфиналы";
  if (key === 92) return "Финал";
  if (key === 93) return "Матч за 3-е место";
  return "Плей-офф";
}

export default function TroikaResultsTable({ data }: { data: TroikaResults }) {
  const winner = data.playoffs.finalStandings.find((t) => t.place === 1);
  const sortedBouts = [...data.playoffs.bouts].sort(
    (a, b) => boutSortKey(a.label) - boutSortKey(b.label),
  );

  const stages = new Map<string, TroikaPlayoffBout[]>();
  for (const bout of sortedBouts) {
    const key = stageLabel(boutSortKey(bout.label));
    if (!stages.has(key)) stages.set(key, []);
    stages.get(key)!.push(bout);
  }

  const stageOrder = [
    "Бои 1–8",
    "Бои 9–16",
    "Бои 17–20",
    "Полуфиналы",
    "Финал",
    "Матч за 3-е место",
    "Плей-офф",
  ];

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        Отборочный турнир и плей-офф на 24 команды. В матчах плей-офф меньший счёт
        побеждает.
      </p>

      {winner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Trophy className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">{winner.name}</p>
        </div>
      )}

      {data.playoffs.finalStandings.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">Итоговая таблица плей-офф</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 text-center w-10">М</th>
                  <th className="px-3 py-2 text-left">Команда</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.playoffs.finalStandings.map((t) => (
                  <tr key={t.place} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                      {t.place}
                    </td>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    {stages.get(stage)!.map((bout) => (
                      <PlayoffBout key={bout.label} bout={bout} />
                    ))}
                  </div>
                </div>
              ))}
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
                  <th className="px-3 py-2 text-left">Команда</th>
                  <th className="px-3 py-2 text-right w-20">Очки</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.qualification.map((t) => (
                  <tr key={t.place} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                      {t.place}
                    </td>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-right">
                      <Score value={t.score} />
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
