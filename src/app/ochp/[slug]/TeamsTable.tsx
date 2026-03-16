"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface TeamMember {
  flag: string;
  player: { id: number; name: string; patronymic: string; surname: string };
}

interface TeamResult {
  team: { id: number; name: string; town: { name: string } };
  current: { name: string; town: { name: string } };
  questionsTotal: number | null;
  position: number;
  teamMembers?: TeamMember[];
}

const FLAG_LABELS: Record<string, string> = {
  "Б": "базовый",
  "Л": "легионер",
  "К": "капитан",
};

export default function TeamsTable({ teams }: { teams: TeamResult[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <h3 className="text-sm font-bold mb-3">Зарегистрированные команды ({teams.length})</h3>
      <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
        {teams.map((r, i) => {
          const isOpen = expanded.has(r.team.id);
          const members = r.teamMembers ?? [];
          const hasMembers = members.length > 0;
          return (
            <div key={r.team.id}>
              <div
                className={`flex items-center gap-3 px-4 py-3 ${hasMembers ? "cursor-pointer hover:bg-surface/50" : ""} ${isOpen ? "bg-surface/30" : ""}`}
                onClick={() => hasMembers && toggle(r.team.id)}
              >
                <span className="text-xs text-muted font-mono w-6 shrink-0 text-right">{i + 1}</span>
                {hasMembers && (
                  <ChevronRight className={`h-3.5 w-3.5 text-muted shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                )}
                {!hasMembers && <span className="w-3.5 shrink-0" />}
                <a
                  href={`https://rating.chgk.info/teams/${r.team.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:text-accent hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.current.name}
                </a>
                <span className="text-xs text-muted">{r.current.town.name}</span>
              </div>
              {isOpen && hasMembers && (
                <div className="bg-surface/40 px-4 py-2.5 border-t border-border/50">
                  <div className="flex flex-wrap gap-1.5 pl-10">
                    {members.map((m) => (
                      <a
                        key={m.player.id}
                        href={`https://rating.chgk.info/players/${m.player.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-white border border-border px-2.5 py-1 text-xs font-medium hover:border-accent/30 hover:text-accent transition-colors"
                        title={FLAG_LABELS[m.flag] ?? m.flag}
                      >
                        {m.player.name} {m.player.surname}
                        {m.flag === "Б" && <span className="text-[10px] text-green-700 font-bold">Б</span>}
                        {m.flag === "Л" && <span className="text-[10px] text-amber-600 font-bold">Л</span>}
                        {m.flag === "К" && <span className="text-[10px] text-accent font-bold">К</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
