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
  showBoutPoints = false,
}: {
  teams: {
    name: string;
    score: number;
    place: number;
    bracket?: string;
    ksi?: number;
    chgk?: number;
    boutPoints?: number;
  }[];
  showBracket?: boolean;
  showKsi?: boolean;
  showBoutPoints?: boolean;
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
          {showBoutPoints && (
            <th className="px-3 py-2 text-right w-16" title="Турнирные очки">
              ТО
            </th>
          )}
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
                  {t.ksi ?? t.chgk ?? "—"}
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
              {showBoutPoints && (
                <td className="px-3 py-2 text-right font-mono text-xs text-muted tabular-nums">
                  {t.boutPoints ?? "—"}
                </td>
              )}
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default function EkResultsTable({ data }: { data: EkResults }) {
  const winner = data.final.teams.find((t) => t.place === 1);
  const isBaskets = data.format === "baskets";
  const isTwoRounds = data.format === "two-rounds";
  const seedCol = data.seedSource === "ЧГК" ? "ЧГК" : data.seedSource;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        {isTwoRounds ? (
          <>
            Два квалификационных боя на 20 команд, суммарная таблица и плей-офф среди
            восьми лучших по итогам {data.seedSource}.
          </>
        ) : isBaskets ? (
          <>
            Турнир на {data.allTeams?.length ?? data.seeds.length} команд с посевом по итогам{" "}
            {data.seedSource}. Пакет «{data.packName}» — четыре корзины соперников для команд
            посева.
          </>
        ) : (
          <>
            Плей-офф на 16 команд с посевом по итогам {data.seedSource}. Четвертьфиналы — 4
            группы по 4 команды, затем 2 полуфинала и финал на 4 команды.
          </>
        )}
      </p>

      {winner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Trophy className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">{winner.name}</p>
          <p className="mt-1 text-sm text-muted">{winner.score} очков в финале плей-офф</p>
        </div>
      )}

      {isTwoRounds && data.final.teams.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">Финал плей-офф</h2>
          <p className="mb-3 text-xs text-muted">{data.final.venue}</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <StageTable teams={data.final.teams} />
          </div>
        </section>
      )}

      {isTwoRounds && data.playoffRounds && data.playoffRounds.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold">Полуфиналы плей-офф</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.playoffRounds.map((round) => (
              <div
                key={round.label}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="border-b border-border bg-muted/15 px-4 py-3">
                  <h3 className="text-sm font-bold">Полуфинал</h3>
                  <p className="mt-0.5 text-xs text-muted">{round.venue}</p>
                </div>
                <StageTable teams={round.teams} showKsi />
              </div>
            ))}
          </div>
        </section>
      )}

      {isTwoRounds && data.standings && data.standings.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">Сумма боёв</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 text-center w-10">М</th>
                  <th className="px-3 py-2 text-left">Команда</th>
                  <th className="px-3 py-2 text-right w-16">Бой 1</th>
                  <th className="px-3 py-2 text-right w-16">Бой 2</th>
                  <th className="px-3 py-2 text-right w-16">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.standings.map((t) => (
                  <tr key={t.name} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                      {t.place}
                    </td>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {t.bout1Points}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {t.bout2Points}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                      {t.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isTwoRounds &&
        data.rounds?.map((round) => (
          <section key={round.number}>
            <h2 className="mb-4 text-base font-bold">{round.label}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {round.groups.map((g) => (
                <div
                  key={g.id}
                  className="overflow-hidden rounded-xl border border-border bg-surface"
                >
                  <div className="border-b border-border bg-muted/15 px-4 py-3">
                    <h3 className="text-sm font-bold">{g.label}</h3>
                    <p className="mt-0.5 text-xs text-muted">{g.venue}</p>
                  </div>
                  <StageTable teams={g.teams} showBoutPoints />
                </div>
              ))}
            </div>
          </section>
        ))}

      {isBaskets && data.baskets && data.baskets.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold">Корзины · {data.packName}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.baskets.map((round) => (
              <div
                key={round.label}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="border-b border-border bg-muted/15 px-4 py-3">
                  <h3 className="text-sm font-bold">{round.label}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                      <th className="px-3 py-2 text-center w-10">№</th>
                      <th className="px-3 py-2 text-left">Команда</th>
                      <th className="px-3 py-2 text-left">Соперник</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {round.matches.map((m) => (
                      <tr key={`${m.seed}-${m.team}`}>
                        <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                          {m.seed}
                        </td>
                        <td className="px-3 py-2 font-medium">{m.team}</td>
                        <td className="px-3 py-2 text-muted">{m.opponent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isBaskets && !isTwoRounds && data.final.teams.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">Финал</h2>
          <p className="mb-3 text-xs text-muted">{data.final.venue}</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <StageTable teams={data.final.teams} />
          </div>
        </section>
      )}

      {!isTwoRounds &&
        !isBaskets &&
        data.semifinals.map((sf) => (
          <section key={sf.number}>
            <h2 className="mb-3 text-base font-bold">{sf.label}</h2>
            <p className="mb-3 text-xs text-muted">{sf.venue}</p>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <StageTable teams={sf.teams} showBracket />
            </div>
          </section>
        ))}

      {!isTwoRounds && !isBaskets && data.quarterfinals.length > 0 && (
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
      )}

      {!isTwoRounds && data.seeds.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">
            {isBaskets ? `Посев по ${data.seedSource}` : `Итоговая таблица`}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 text-center w-14">{seedCol}</th>
                  <th className="px-3 py-2 text-left">Команда</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.seeds.map((s) => (
                  <tr key={`${s.ksi ?? s.chgk}-${s.name}`} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-center font-mono text-xs text-muted">
                      {s.ksi ?? s.chgk}
                    </td>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isBaskets && data.allTeams && data.allTeams.length > data.seeds.length && (
        <section>
          <h2 className="mb-3 text-base font-bold">Все команды</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <ul className="divide-y divide-border/60 text-sm">
              {data.allTeams.map((name) => (
                <li key={name} className="px-4 py-2.5 font-medium">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
