import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Users } from "lucide-react";
import { fetchDsParticipants } from "@/lib/ds-participants";
import type { DsParticipant, DsParticipantsResult, ParticipantCategory } from "@/lib/ds-participants";

export const metadata: Metadata = {
  title: "Участники | Dziki Sopot 🐗 2026",
  description: "Список команд-участников Dziki Sopot 2026",
};


// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<
  ParticipantCategory,
  { label: string; description: string; rowCls: string; badgeCls: string; dotCls: string }
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
    description: "Предварительно проходят по рейтингу",
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "22.03.2026 13:06:04" → "22.03 13:06" */
function fmtTimestamp(raw: string): string {
  if (!raw) return "—";
  // Format: DD.MM.YYYY HH:mm:ss
  const parts = raw.trim().split(" ");
  const datePart = parts[0] ?? "";
  const timePart = parts[1] ?? "";
  const [day, month] = datePart.split(".");
  const timeShort = timePart.slice(0, 5); // "13:06"
  if (!day || !month) return raw;
  return `${day}.${month} ${timeShort}`;
}

/**
 * Green solid  = confirmed: Время or ВК (regardless of 2DS)
 * Orange blink = preliminary: Рейтинг (with or without 2DS),
 *                              or inBothDs as the only factor (category "none")
 * Empty        = no indicator
 */
function TrafficLight({ cat, inBothDs }: { cat: ParticipantCategory; inBothDs: boolean }) {
  if (cat === "time" || cat === "vk") {
    return (
      <span
        className="inline-block h-3 w-3 rounded-full bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.5)]"
        title="Участие подтверждено"
      />
    );
  }
  if (cat === "rating" || inBothDs) {
    return (
      <span
        className="animate-traffic-pulse inline-block h-3 w-3 rounded-full"
        title={
          cat === "rating" && inBothDs
            ? "Предварительно проходят по рейтингу · Участие в 2 ДС"
            : cat === "rating"
              ? "Предварительно проходят по рейтингу"
              : "Участие в 2 ДС"
        }
      />
    );
  }
  return <span className="inline-block h-3 w-3" />;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchParticipantsData(): Promise<DsParticipantsResult> {
  try {
    return await fetchDsParticipants();
  } catch {
    return { participants: [], ratingReleaseDate: null };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DsParticipantsPage() {
  await headers(); // opt out of static caching — render on every request
  const { participants, ratingReleaseDate } = await fetchParticipantsData();

  const counts = {
    time:        participants.filter((p) => p.category === "time").length,
    vk:          participants.filter((p) => p.category === "vk").length,
    rating:      participants.filter((p) => p.category === "rating" && !p.inBothDs).length,
    ds2:         participants.filter((p) => p.category === "ds2").length,
    none:        participants.filter((p) => p.category === "none" && !p.inBothDs).length,
    // Green dot: confirmed (Время or ВК, regardless of inBothDs)
    confirmed:   participants.filter((p) => p.category === "time" || p.category === "vk").length,
    // Orange dot: preliminary (rating any, or none+inBothDs)
    preliminary: participants.filter(
      (p) => (p.category === "rating" || p.inBothDs) && p.category !== "time" && p.category !== "vk"
    ).length,
    inBothDs:    participants.filter((p) => p.inBothDs).length,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
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
          Dziki Sopot 🐗 — 2026
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Участники</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{participants.length} команд</span>
          {ratingReleaseDate && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium shadow-sm">
              Рейтинг по состоянию релиза{" "}
              <span className="font-semibold text-foreground">{ratingReleaseDate}</span>
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        {/* Traffic light summary */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-sm">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.5)]" />
          <span>Участие подтверждено</span>
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
            {counts.confirmed}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-sm">
          <span className="animate-traffic-pulse inline-block h-3 w-3 rounded-full" />
          <span>Предварительно проходят</span>
          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
            {counts.preliminary}
          </span>
        </div>

        {/* Category legend — badge pill style matching the table */}
        {(
          [
            { cat: "time",   count: counts.time },
            { cat: "vk",     count: counts.vk },
            { cat: "rating", count: counts.rating },
            { cat: "ds2",    count: counts.inBothDs },
            { cat: "none",   count: counts.none },
          ] as { cat: ParticipantCategory; count: number }[]
        ).map(({ cat, count }) => {
          const cfg = CAT_CONFIG[cat];
          if (count === 0) return null;
          return (
            <div
              key={cat}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-sm"
            >
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badgeCls}`}>
                {cat === "ds2" ? "Участие в 2 ДС" : cfg.label}
              </span>
              {cat !== "none" && (
                <span className="text-muted">— {cfg.description}</span>
              )}
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
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-3 py-2.5 text-center w-6" title="Статус участия"></th>
                <th className="px-3 py-2.5 text-center w-8">#</th>
                <th className="px-3 py-2.5 text-left">Команда</th>
                <th className="px-3 py-2.5 text-left hidden sm:table-cell">Город</th>
                <th className="px-3 py-2.5 text-right hidden sm:table-cell">Место</th>
                <th className="px-3 py-2.5 text-left hidden lg:table-cell">Зарегистрировалась</th>
                <th className="px-3 py-2.5 text-left">Категория</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, idx) => {
                const cfg = CAT_CONFIG[p.category];
                // Teams whose only entry factor is 2DS (category "none") get amber row
                const rowCls =
                  p.category === "none" && p.inBothDs ? "bg-amber-50/60" : cfg.rowCls;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-border/50 last:border-0 transition-colors hover:brightness-[0.97] ${rowCls}`}
                  >
                    {/* Traffic light */}
                    <td className="px-3 py-2 text-center">
                      <TrafficLight cat={p.category} inBothDs={p.inBothDs} />
                    </td>

                    {/* # */}
                    <td className="px-3 py-2 text-center text-xs font-bold text-muted">
                      {idx + 1}
                    </td>

                    {/* Team name */}
                    <td className="px-3 py-2 font-medium">
                      {p.teamId > 0 ? (
                        <a
                          href={`https://rating.chgk.info/teams/${p.teamId}`}
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

                    {/* City */}
                    <td className="px-3 py-2 text-muted hidden sm:table-cell">
                      {p.city || "—"}
                    </td>

                    {/* Rating position */}
                    <td className="px-3 py-2 text-right font-mono text-sm hidden sm:table-cell">
                      {p.ratingPosition !== null ? (
                        p.ratingPosition
                      ) : p.rating !== null ? (
                        p.rating
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Registration timestamp */}
                    <td className="px-3 py-2 text-xs text-muted tabular-nums hidden lg:table-cell whitespace-nowrap">
                      {fmtTimestamp(p.registeredAt)}
                    </td>

                    {/* Category badge */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5 items-start">
                        {p.category !== "none" && !(p.inBothDs && p.category === "ds2") && (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cfg.badgeCls}`}
                          >
                            {p.categoryLabel}
                          </span>
                        )}
                        {p.inBothDs && (
                          <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap bg-amber-100 text-amber-700">
                            Участие в 2 ДС
                          </span>
                        )}
                        {!p.inBothDs && p.category === "none" && (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </div>
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
        .{" "}Рейтинг —{" "}
        <a
          href="https://rating.chgk.gg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-accent"
        >
          rating.chgk.gg
        </a>
        .
      </p>
    </div>
  );
}
