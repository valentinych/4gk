import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Users } from "lucide-react";
import { fetchDsParticipants } from "@/lib/ds-participants";
import type { DsParticipant, ParticipantCategory } from "@/lib/ds-participants";

export const metadata: Metadata = {
  title: "Участники DS'26 | Dziki Sopot",
  description: "Список команд-участников Dziki Sopot 2026",
};

export const revalidate = 300;

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<
  ParticipantCategory,
  {
    label: string;
    description: string;
    rowCls: string;
    badgeCls: string;
    dotCls: string;
  }
> = {
  time: {
    label: "Время",
    description: "Зарегистрировались первыми",
    rowCls: "bg-sky-50/60",
    badgeCls: "bg-sky-100 text-sky-700",
    dotCls: "bg-sky-400",
  },
  vk: {
    label: "ВК",
    description: "Приглашены организаторами",
    rowCls: "bg-violet-50/60",
    badgeCls: "bg-violet-100 text-violet-700",
    dotCls: "bg-violet-400",
  },
  rating: {
    label: "Рейтинг",
    description: "Прошли по рейтингу",
    rowCls: "bg-emerald-50/60",
    badgeCls: "bg-emerald-100 text-emerald-700",
    dotCls: "bg-emerald-400",
  },
  ds2: {
    label: "Участие в 2 ДС",
    description: "Участвовали в двух предыдущих ДС",
    rowCls: "bg-amber-50/60",
    badgeCls: "bg-amber-100 text-amber-700",
    dotCls: "bg-amber-400",
  },
  none: {
    label: "—",
    description: "Без категории",
    rowCls: "",
    badgeCls: "bg-gray-100 text-gray-500",
    dotCls: "bg-gray-300",
  },
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchParticipants(): Promise<DsParticipant[]> {
  try {
    return await fetchDsParticipants();
  } catch {
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DsParticipantsPage() {
  const participants = await fetchParticipants();

  const counts = {
    time: participants.filter((p) => p.category === "time").length,
    vk: participants.filter((p) => p.category === "vk").length,
    rating: participants.filter((p) => p.category === "rating").length,
    ds2: participants.filter((p) => p.category === "ds2").length,
    none: participants.filter((p) => p.category === "none").length,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Back */}
      <Link
        href="/dziki-sopot"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dziki Sopot
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Users className="h-3.5 w-3.5" />
          DS&apos;26
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Участники
        </h1>
        <p className="mt-1 text-sm text-muted">
          {participants.length} команд
          {participants.length !== participants.length && ""}
        </p>
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        {(["time", "vk", "rating", "ds2", "none"] as ParticipantCategory[]).map((cat) => {
          const cfg = CAT_CONFIG[cat];
          const count = counts[cat];
          if (cat === "none" && count === 0) return null;
          return (
            <div
              key={cat}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotCls}`} />
              <span>
                {cfg.label}
                {cat !== "none" && (
                  <span className="ml-1 text-muted">— {cfg.description}</span>
                )}
              </span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cfg.badgeCls}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      {participants.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-sm text-muted">
          Данные недоступны
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-3 py-2.5 text-center w-8">#</th>
                <th className="px-3 py-2.5 text-left">Команда</th>
                <th className="px-3 py-2.5 text-left hidden sm:table-cell">Город</th>
                <th className="px-3 py-2.5 text-right hidden md:table-cell">Рейтинг</th>
                <th className="px-3 py-2.5 text-left">Категория</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, idx) => {
                const cfg = CAT_CONFIG[p.category];
                return (
                  <tr
                    key={idx}
                    className={`border-b border-border/50 last:border-0 transition-colors hover:brightness-[0.97] ${cfg.rowCls}`}
                  >
                    <td className="px-3 py-2 text-center text-xs font-bold text-muted">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {p.teamId > 0 ? (
                        <a
                          href={`https://rating.chgk.info/team/${p.teamId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-accent transition-colors"
                        >
                          {p.team}
                          <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                        </a>
                      ) : (
                        p.team
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted hidden sm:table-cell">
                      {p.city || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm hidden md:table-cell">
                      {p.rating !== null ? p.rating : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {p.category !== "none" ? (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badgeCls}`}
                        >
                          {p.categoryLabel}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Данные обновляются автоматически из{" "}
        <a
          href="https://docs.google.com/spreadsheets/d/1muLzibrQamNZxNk-fA7gCvrLLXqzVhJXMT_f1UCZ_nU/edit"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-accent"
        >
          Google Sheets
        </a>
        .
      </p>
    </div>
  );
}
