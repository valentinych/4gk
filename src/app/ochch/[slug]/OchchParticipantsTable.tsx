"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ochchInviteFor, type OchchImportedTeam } from "@/lib/ochch";

export function OchchParticipantsTable({
  teams,
  rosterChgkIds,
  amateurChgkIds,
  canToggleAmateur,
}: {
  teams: OchchImportedTeam[];
  rosterChgkIds: number[];
  amateurChgkIds: number[];
  canToggleAmateur: boolean;
}) {
  const roster = new Set(rosterChgkIds);
  const [amateur, setAmateur] = useState(() => new Set(amateurChgkIds));
  const [pending, setPending] = useState<number | null>(null);

  async function toggleAmateur(teamChgkId: number, next: boolean) {
    const prev = new Set(amateur);
    setAmateur((cur) => {
      const copy = new Set(cur);
      if (next) copy.add(teamChgkId);
      else copy.delete(teamChgkId);
      return copy;
    });
    setPending(teamChgkId);
    try {
      const res = await fetch("/api/ochch/amateur", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamChgkId, amateur: next }),
      });
      if (!res.ok) setAmateur(prev);
    } catch {
      setAmateur(prev);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
            <th className="w-10 px-3 py-2.5 text-left font-medium">№</th>
            <th className="px-3 py-2.5 text-left font-medium">Команда</th>
            <th
              className="w-14 px-1.5 py-2.5 text-center font-medium"
              title="Подан состав"
            >
              Состав
            </th>
            <th className="px-3 py-2.5 text-left font-medium">Город</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {teams.map((t) => {
            const invite = ochchInviteFor(t);
            const hasRoster = roster.has(t.teamChgkId);
            const isAmateur = amateur.has(t.teamChgkId);
            return (
              <tr
                key={t.teamChgkId}
                id={`ochch-team-${t.teamChgkId}`}
                className="scroll-mt-20 hover:bg-surface/50"
              >
                <td className="px-3 py-2.5 font-mono text-muted">{t.number}</td>
                <td className="px-3 py-2.5 font-medium">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {invite.czech ? (
                      <span title="Чешская команда">🇨🇿</span>
                    ) : null}
                    {isAmateur ? (
                      <span title="Любительская команда">🟢</span>
                    ) : null}
                    <span className="whitespace-nowrap">{t.name}</span>
                    {canToggleAmateur ? (
                      <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-normal text-muted">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-emerald-600"
                          checked={isAmateur}
                          disabled={pending === t.teamChgkId}
                          onChange={() => toggleAmateur(t.teamChgkId, !isAmateur)}
                          aria-label={`Любительская команда: ${t.name}`}
                        />
                        любительская
                      </label>
                    ) : null}
                  </div>
                </td>
                <td className="px-1.5 py-2.5 text-center">
                  {hasRoster ? (
                    <span
                      className="inline-flex justify-center"
                      role="img"
                      title="Состав подан"
                      aria-label="Состав подан"
                    >
                      <CheckCircle2
                        className="h-4 w-4 text-emerald-500"
                        aria-hidden
                      />
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                  {t.city}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
