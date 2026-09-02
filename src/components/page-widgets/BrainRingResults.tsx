"use client";

import { ROUND_LABELS, type BrainRingMatchDto, type BrainRingPublicGroup } from "@/lib/brain-ring";

export function BrainRingResults({
  groups,
  finals,
}: {
  groups: BrainRingPublicGroup[];
  finals: BrainRingMatchDto[];
}) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.letter} className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-4 py-2.5">
            <span className="text-xs font-bold text-accent">Группа {group.letter}</span>
            {group.letterName ? <span className="text-xs text-muted">({group.letterName})</span> : null}
            {group.venue ? <span className="mx-auto text-xs text-muted">{group.venue}</span> : null}
            {group.time ? <span className="ml-auto text-xs text-muted">{group.time}</span> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
                  <th className="w-6 px-2 py-1.5 text-right">№</th>
                  <th className="min-w-[120px] px-2 py-1.5 text-left">Команда</th>
                  <th className="w-6 px-2 py-1.5 text-center" title="Игры">
                    И
                  </th>
                  <th className="w-6 px-2 py-1.5 text-center" title="Победы">
                    В
                  </th>
                  <th className="w-6 px-2 py-1.5 text-center" title="Ничьи">
                    Н
                  </th>
                  <th className="w-6 px-2 py-1.5 text-center" title="Поражения">
                    П
                  </th>
                  <th className="w-8 px-2 py-1.5 text-center" title="Забито">
                    З+
                  </th>
                  <th className="w-8 px-2 py-1.5 text-center" title="Пропущено">
                    З−
                  </th>
                  <th className="w-8 px-2 py-1.5 text-center" title="Разница">
                    ±
                  </th>
                  <th className="w-8 bg-surface/50 px-2 py-1.5 text-center font-bold" title="Очки">
                    О
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.teams.map((t, ti) => (
                  <tr key={`${group.letter}-${t.name}-${ti}`} className={`hover:bg-surface/50 ${ti < 2 ? "bg-emerald-50/30" : ""}`}>
                    <td className="px-2 py-1.5 text-right font-mono text-muted">{t.pos}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-medium">{t.name}</td>
                    <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.played}</td>
                    <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.win}</td>
                    <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.draw}</td>
                    <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.lost}</td>
                    <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.gf}</td>
                    <td className="px-2 py-1.5 text-center font-mono tabular-nums">{t.ga}</td>
                    <td className="px-2 py-1.5 text-center font-mono tabular-nums">
                      {t.diff > 0 ? `+${t.diff}` : t.diff}
                    </td>
                    <td className="bg-surface/50 px-2 py-1.5 text-center font-mono font-bold tabular-nums">
                      {t.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {finals.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border bg-surface/50 px-4 py-2.5">
            <span className="text-xs font-bold text-accent">Финалы</span>
          </div>
          <div className="divide-y divide-border">
            {finals.map((f) => (
              <div key={f.id} className={`px-4 py-3 ${f.active ? "bg-amber-50/40" : ""}`}>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">
                  {ROUND_LABELS[f.round] ?? f.round}
                  {f.venue ? ` · ${f.venue}` : ""}
                  {f.active ? " · ход боя" : ""}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex-1 text-right text-sm font-medium ${f.scoreA > f.scoreB ? "font-bold" : ""}`}>
                    {f.teamAName}
                  </span>
                  <div className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1 font-mono text-sm font-bold tabular-nums">
                    <span>{f.scoreA}</span>
                    <span className="text-muted">:</span>
                    <span>{f.scoreB}</span>
                  </div>
                  <span className={`flex-1 text-sm font-medium ${f.scoreB > f.scoreA ? "font-bold" : ""}`}>
                    {f.teamBName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
