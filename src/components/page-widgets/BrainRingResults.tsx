"use client";

import { ROUND_LABELS, scoreLine, type BrainRingMatchDto, type BrainRingPublicGroup } from "@/lib/brain-ring";

export function BrainRingResults({
  groups,
  finals,
  hideSections = false,
}: {
  groups: BrainRingPublicGroup[];
  finals: BrainRingMatchDto[];
  hideSections?: boolean;
}) {
  let lastSection = "";
  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const sectionChanged = Boolean(group.section && group.section !== lastSection);
        if (group.section) lastSection = group.section;
        const top = group.highlightTop ?? 2;
        const key = group.isCombined ? "overall" : `${group.letter}-${group.letterName}`;
        return (
          <div key={key}>
            {sectionChanged && !hideSections ? (
              <h3 className={`mb-2 text-sm font-semibold ${group.isCombined ? "text-accent" : "text-foreground"}`}>
                {group.section}
              </h3>
            ) : null}
            <div
              className={`overflow-hidden rounded-xl border bg-surface ${
                group.isCombined ? "border-accent/40" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-4 py-2.5">
                <span className="text-xs font-bold text-accent">
                  {group.letter ? `Группа ${group.letter}` : group.letterName || "Таблица"}
                </span>
                {group.letter && group.letterName ? (
                  <span className="text-xs text-muted">({group.letterName})</span>
                ) : null}
                {group.placeholder ? <span className="text-xs text-muted">· места этапа 1</span> : null}
                {group.venue ? <span className="mx-auto text-xs text-muted">{group.venue}</span> : null}
                {group.time ? <span className="ml-auto text-xs text-muted">{group.time}</span> : null}
              </div>
              <div className="overflow-x-auto">
                {group.teams.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted">{group.emptyHint ?? "Нет сыгранных матчей"}</p>
                ) : (
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
                    {group.teams.map((t, ti) => {
                      const isOut = Boolean(group.outLast && ti === group.teams.length - 1 && group.teams.length >= 5);
                      const isIn = top > 0 && Number(t.pos) <= top && !isOut;
                      return (
                        <tr
                          key={`${key}-${t.name}-${ti}`}
                          className={`hover:bg-surface/50 ${isIn ? "bg-emerald-50/30" : ""} ${isOut ? "bg-red-50/40 text-muted" : ""}`}
                        >
                          <td className="px-2 py-1.5 text-right font-mono text-muted">{t.pos}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 font-medium">
                            {t.name}
                            {isOut ? <span className="ml-1 text-[10px] font-normal text-red-700">вылет</span> : null}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {finals.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border bg-surface/50 px-4 py-2.5">
            <span className="text-xs font-bold text-accent">
              {finals.some((f) => f.kind === "bracket") ? "Сетка" : finals.length === 1 && finals[0]?.teamIds.length === 4 ? "Финал" : "Финалы"}
            </span>
          </div>
          <div className="divide-y divide-border">
            {finals.map((f) => (
              <div key={f.id} className={`px-4 py-3 ${f.active ? "bg-amber-50/40" : ""}`}>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">
                  {ROUND_LABELS[f.round] ?? f.round}
                  {f.venue ? ` · ${f.venue}` : ""}
                  {f.active ? " · ход боя" : f.status === "finished" ? "" : f.status === "started" ? " · идёт" : ""}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {(f.teamNames.length ? f.teamNames : [f.teamAName, f.teamBName]).map((name, i) => {
                    const sc = f.scores[i] ?? (i === 0 ? f.scoreA : f.scoreB);
                    const best = Math.max(0, ...f.scores, f.scoreA, f.scoreB);
                    return (
                      <span key={`${f.id}-${i}`} className={`text-sm font-medium ${sc === best && best > 0 ? "font-bold" : ""}`}>
                        {name || "—"}
                      </span>
                    );
                  })}
                  <div className="rounded-lg bg-surface px-3 py-1 font-mono text-sm font-bold tabular-nums">
                    {scoreLine(f)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
