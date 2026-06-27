import { Trophy } from "lucide-react";
import type {
  BrainPlayoffBout,
  BrainPlayoffMatch,
  BrainResults,
} from "@/lib/turnirushki-brain";

function MatrixCell({ cell }: { cell: import("@/lib/turnirushki-brain").BrainMatrixCell }) {
  if (cell.self) {
    return <span className="font-mono text-muted">X</span>;
  }
  if (cell.scored == null && cell.conceded == null) {
    return <span className="text-muted/40">—</span>;
  }
  return (
    <div className="leading-tight">
      <div className="font-mono tabular-nums">
        {cell.scored ?? "—"} {cell.conceded ?? "—"}
      </div>
      {cell.matchPoints != null && (
        <div className="text-[10px] font-semibold text-muted tabular-nums">{cell.matchPoints}</div>
      )}
    </div>
  );
}

function GroupGrid({ group }: { group: import("@/lib/turnirushki-brain").BrainGroup }) {
  const teams = [...group.teams].sort((a, b) => a.num - b.num);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-xs border-collapse">
        <thead>
          <tr className="bg-muted/10 text-[10px] uppercase tracking-wide text-muted">
            <th className="px-1.5 py-1.5 text-center w-6">№</th>
            <th className="px-1.5 py-1.5 text-left min-w-[120px]">Команда</th>
            {[1, 2, 3, 4].map((n) => (
              <th key={n} className="px-1 py-1.5 text-center w-11">
                {n}
              </th>
            ))}
            <th className="px-1 py-1.5 text-center w-7" title="Турнирные очки">
              О
            </th>
            <th className="px-1 py-1.5 text-center w-7" title="Разница">
              Р
            </th>
            <th className="px-1 py-1.5 text-center w-7" title="Забито">
              З
            </th>
            <th className="px-1 py-1.5 text-center w-6" title="Место">
              М
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.num} className="border-t border-border/50">
              <td className="px-1.5 py-1.5 text-center font-mono text-muted">{t.num}</td>
              <td className="px-1.5 py-1.5 font-medium">
                <span className="inline-flex flex-wrap items-center gap-1">
                  {t.bracket && (
                    <span className="font-mono text-[10px] text-accent">{t.bracket}</span>
                  )}
                  {t.name}
                  {t.amateur && (
                    <span className="rounded bg-emerald-50 px-1 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                      Л
                    </span>
                  )}
                </span>
              </td>
              {t.matrix.map((cell, ci) => (
                <td key={ci} className="px-1 py-1.5 text-center align-middle">
                  <MatrixCell cell={cell} />
                </td>
              ))}
              <td className="px-1 py-1.5 text-center font-mono font-bold tabular-nums">
                {t.tournamentPoints ?? "—"}
              </td>
              <td className="px-1 py-1.5 text-center font-mono tabular-nums">
                {t.diff ?? "—"}
              </td>
              <td className="px-1 py-1.5 text-center font-mono tabular-nums">
                {t.scored ?? "—"}
              </td>
              <td className="px-1 py-1.5 text-center font-mono font-bold tabular-nums">
                {t.place ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pairMatches(matches: BrainPlayoffMatch[]) {
  const pairs: [BrainPlayoffMatch, BrainPlayoffMatch | undefined][] = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push([matches[i], matches[i + 1]]);
  }
  return pairs;
}

function PlayoffBout({ bout }: { bout: BrainPlayoffBout }) {
  const pairs = pairMatches(bout.matches);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="border-b border-border bg-muted/15 px-4 py-2.5 text-sm font-semibold">
        {bout.label}
      </div>
      <ul className="divide-y divide-border/60 text-sm">
        {pairs.map(([a, b], idx) => (
          <li key={idx} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5">
            <span className="font-mono text-xs text-muted">{a.slot}</span>
            <span className="font-medium">{a.team}</span>
            <span className="font-mono font-bold tabular-nums">{a.score ?? "—"}</span>
            {b && (
              <>
                <span className="text-muted">:</span>
                <span className="font-mono font-bold tabular-nums">{b.score ?? "—"}</span>
                <span className="font-medium">{b.team}</span>
                <span className="font-mono text-xs text-muted">{b.slot}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BrainResultsTable({ data }: { data: BrainResults }) {
  const isBracketPath = data.playoffs.format === "bracket-path";
  const isDoubleElim = data.playoffs.format === "double-elimination";
  const winner = data.playoffs.final.teams.find((t) => t.place === 1);
  const hasPlayoffs = data.playoffs.final.teams.length > 0;
  const groupCount = data.groups.length;
  const teamCount = data.seeds.length;
  const deStages = isDoubleElim ? [...(data.playoffs.stages ?? [])].reverse() : [];

  if (isBracketPath) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-muted leading-relaxed">
          {teamCount} команд с посевом по итогам {data.seedSource}. Турнир на выбывание:
          путь каждой команды по этапам плей-офф.
        </p>
        {winner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
            <div className="flex items-center gap-2 text-amber-800">
              <Trophy className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
            </div>
            <p className="mt-2 text-xl font-bold">{winner.name}</p>
            {winner.score != null && winner.score2 != null && (
              <p className="mt-1 text-sm text-muted">
                {winner.score}:{winner.score2} в финале (до 3 побед)
              </p>
            )}
          </div>
        )}
        {hasPlayoffs && (
          <section>
            <h2 className="mb-3 text-base font-bold">Финал</h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 text-center w-10">М</th>
                    <th className="px-3 py-2 text-left">Команда</th>
                    <th className="px-3 py-2 text-right w-16">Счёт</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.playoffs.final.teams.map((t) => (
                    <tr key={t.name}>
                      <td className="px-3 py-2 text-center font-mono text-muted">{t.place}</td>
                      <td className="px-3 py-2 font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                        {t.score2 != null ? `${t.score}:${t.score2}` : (t.score ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {(data.playoffs.bracket?.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-3 text-base font-bold">Путь команд</h2>
            <div className="space-y-3">
              {data.playoffs.bracket!.map((entry) => (
                <div
                  key={entry.name}
                  className="rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <p className="font-semibold mb-2">{entry.name}</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {entry.path.map((step, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-muted/20 px-2 py-1 font-mono text-xs"
                      >
                        {step.opponent} → {step.result}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        {isDoubleElim ? (
          <>
            {teamCount} команд с посевом по итогам {data.seedSource}: {groupCount} групп по 4,
            плей-офф по системе double elimination. В ячейке сетки — счёт матча (забито
            пропущено), под ним турнирные очки за матч.
          </>
        ) : (
          <>
            {teamCount} команд с посевом по итогам {data.seedSource}: {groupCount} групп по 4
            {hasPlayoffs ? ", в плей-офф проходят первые две" : ""}. В ячейке сетки — счёт матча
            (забито пропущено), под ним турнирные очки за матч. О — сумма очков, Р — разница, З —
            забито, М — место в группе.
          </>
        )}
      </p>

      {winner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Trophy className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
          </div>
          <p className="mt-2 text-xl font-bold">{winner.name}</p>
          {winner.score != null && (
            <p className="mt-1 text-sm text-muted">
              {isDoubleElim && winner.score2 != null
                ? `${winner.score}:${winner.score2} в грандфинале`
                : `${winner.score} в финале`}
            </p>
          )}
        </div>
      )}

      {hasPlayoffs && (
        <section>
          <h2 className="mb-3 text-base font-bold">
            {isDoubleElim ? "Грандфинал" : "Финал"}
          </h2>
          <p className="mb-3 text-xs text-muted">{data.playoffs.final.venue}</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 text-center w-10">М</th>
                  <th className="px-3 py-2 text-left">Команда</th>
                  {isDoubleElim ? (
                    <>
                      <th className="px-3 py-2 text-right w-12">1</th>
                      <th className="px-3 py-2 text-right w-12">2</th>
                    </>
                  ) : (
                    <th className="px-3 py-2 text-right w-16">Счёт</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.playoffs.final.teams.map((t) => (
                  <tr key={t.name}>
                    <td className="px-3 py-2 text-center font-mono text-muted">{t.place}</td>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    {isDoubleElim ? (
                      <>
                        <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                          {t.score ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                          {t.score2 ?? "—"}
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                        {t.score ?? "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isDoubleElim &&
        deStages.slice(1).map((stage) => (
          <section key={stage.label}>
            <h2 className="mb-4 text-base font-bold">{stage.label}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {stage.bouts.map((b) => (
                <PlayoffBout key={b.label} bout={b} />
              ))}
            </div>
          </section>
        ))}

      {!isDoubleElim && data.playoffs.thirdPlace.teams.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">{data.playoffs.thirdPlace.label}</h2>
          <p className="mb-3 text-xs text-muted">{data.playoffs.thirdPlace.venue}</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-border/60">
                {data.playoffs.thirdPlace.teams.map((t) => (
                  <tr key={t.name}>
                    <td className="px-3 py-2 text-center font-mono text-muted w-10">{t.place}</td>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold tabular-nums w-16">
                      {t.score ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isDoubleElim && data.playoffs.semifinals.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold">Полуфиналы</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.playoffs.semifinals.map((b) => (
              <PlayoffBout key={b.label} bout={b} />
            ))}
          </div>
        </section>
      )}

      {!isDoubleElim && data.playoffs.quarterfinals.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold">Четвертьфиналы</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.playoffs.quarterfinals.map((b) => (
              <PlayoffBout key={b.label} bout={b} />
            ))}
          </div>
        </section>
      )}

      {!isDoubleElim && data.playoffs.roundOf16.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold">1/8 финала</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.playoffs.roundOf16.map((b) => (
              <PlayoffBout key={b.label} bout={b} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-base font-bold">Групповой этап</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.groups.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border bg-muted/15 px-4 py-3">
                <h3 className="text-sm font-bold">{g.label}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {[g.venue, g.host, g.session].filter(Boolean).join(" · ")}
                </p>
              </div>
              <GroupGrid group={g} />
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
                <th className="px-3 py-2 text-center w-14">Место</th>
                <th className="px-3 py-2 text-left">Команда</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.seeds.map((s) => (
                <tr key={s.chgkPlace} className="hover:bg-surface/50">
                  <td className="px-3 py-2 text-center font-mono text-muted">{s.chgkPlace}</td>
                  <td className="px-3 py-2 font-medium">
                    {s.name}
                    {s.amateur && (
                      <span className="ml-1.5 rounded bg-emerald-50 px-1 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                        Л
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
