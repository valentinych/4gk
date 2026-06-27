import { Trophy } from "lucide-react";
import type {
  BrainPlayoffBout,
  BrainPlayoffMatch,
  BrainResults,
} from "@/lib/turnirushki-brain";

function pairMatches(matches: BrainPlayoffMatch[]): [BrainPlayoffMatch, BrainPlayoffMatch | undefined][] {
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
  const winner = data.playoffs.final.teams.find((t) => t.place === 1);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted leading-relaxed">
        32 команды с посевом по итогам {data.seedSource}: 8 групп по 4, два захода, в плей-офф
        проходят первые две. В ячейках групп — матчи 4×4; в плей-офф указан счёт (взятые вопросы).
      </p>

      {winner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Trophy className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold uppercase tracking-wide">Победитель</span>
          </div>
          <p className="mt-2 text-xl font-bold">{winner.name}</p>
          {winner.score != null && (
            <p className="mt-1 text-sm text-muted">{winner.score} в финале</p>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold">Финал</h2>
        <p className="mb-3 text-xs text-muted">{data.playoffs.final.venue}</p>
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
                    {t.score ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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

      {data.playoffs.semifinals.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold">Полуфиналы</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.playoffs.semifinals.map((b) => (
              <PlayoffBout key={b.label} bout={b} />
            ))}
          </div>
        </section>
      )}

      {data.playoffs.quarterfinals.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold">Четвертьфиналы</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.playoffs.quarterfinals.map((b) => (
              <PlayoffBout key={b.label} bout={b} />
            ))}
          </div>
        </section>
      )}

      {data.playoffs.roundOf16.length > 0 && (
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
                  {g.venue} · {g.host} · {g.session}
                </p>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-muted/10 text-[10px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left w-8">М</th>
                    <th className="px-2 py-1.5 text-left">Команда</th>
                    <th className="px-2 py-1.5 text-right" title="Забито">
                      О
                    </th>
                    <th className="px-2 py-1.5 text-right" title="Разница">
                      Р
                    </th>
                    <th className="px-2 py-1.5 text-right" title="Нули">
                      З
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.teams.map((t) => (
                    <tr key={t.name} className="border-t border-border/50">
                      <td className="px-2 py-1.5 font-mono text-muted">{t.place}</td>
                      <td className="px-2 py-1.5 font-medium">
                        <span className="inline-flex items-center gap-1">
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
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {t.scoredFor ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {t.diff ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {t.zeros ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
