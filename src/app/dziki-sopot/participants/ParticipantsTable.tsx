"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, ExternalLink, Loader2, Pencil, X } from "lucide-react";
import type { ParticipantCategory } from "@/lib/ds-participants";
import type { DsDisplayParticipant } from "@/lib/ds-participants-overrides";
import {
  buildDisplayList,
  countParticipants,
  participantShownName,
} from "@/lib/ds-participants-display";

const RATING_LOCK_DATE_LABEL = "14.05.2026";

const CAT_CONFIG: Record<
  ParticipantCategory,
  { label: string; description: string; rowCls: string; badgeCls: string }
> = {
  time: {
    label: "Время",
    description: "Зарегистрировались первыми",
    rowCls: "bg-sky-50/60",
    badgeCls: "bg-sky-100 text-sky-700",
  },
  vk: {
    label: "ВК",
    description: "Приглашены организаторами",
    rowCls: "bg-violet-50/60",
    badgeCls: "bg-violet-100 text-violet-700",
  },
  rating: {
    label: "Рейтинг",
    description: "Проходят по рейтингу",
    rowCls: "bg-emerald-50/60",
    badgeCls: "bg-emerald-100 text-emerald-700",
  },
  ds2: {
    label: "Участие в 2 DS",
    description: "Участвовали в двух предыдущих DS",
    rowCls: "bg-amber-50/60",
    badgeCls: "bg-amber-100 text-amber-700",
  },
  none: {
    label: "—",
    description: "Без категории",
    rowCls: "",
    badgeCls: "bg-gray-100 text-gray-500",
  },
};

function TrafficLight({ confirmed }: { confirmed: boolean }) {
  if (!confirmed) return <span className="inline-block h-3 w-3" />;
  return (
    <span
      className="inline-block h-3 w-3 rounded-full bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.5)]"
      title="Участие подтверждено"
    />
  );
}

export function ParticipantsTable({
  participants,
  ratingReleaseDate,
  isAdmin,
}: {
  participants: DsDisplayParticipant[];
  ratingReleaseDate: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const counts = countParticipants(participants);
  const { confirmed, waitlist, displayList } = buildDisplayList(participants);

  async function handleOverride(key: string, action: "remove" | "confirm") {
    setBusyKey(key);
    try {
      const res = await fetch("/api/dziki-sopot/participants/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, action }),
      });
      if (!res.ok) return;
      startTransition(() => router.refresh());
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDisplayName(key: string, displayName: string | null) {
    setBusyKey(key);
    try {
      const res = await fetch("/api/dziki-sopot/participants/display-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, displayName }),
      });
      if (!res.ok) return false;
      startTransition(() => router.refresh());
      return true;
    } finally {
      setBusyKey(null);
    }
  }

  if (participants.length === 0) {
    return (
      <div
        id="page-ds-participants-empty"
        className="rounded-xl border-2 border-dashed border-border p-12 text-center text-sm text-muted"
      >
        Данные недоступны
      </div>
    );
  }

  return (
    <>
      <div
        id="page-ds-participants-summary"
        className="mb-6 -mt-4 flex flex-wrap items-center gap-3 text-sm text-muted"
      >
        <span>{counts.total} команд</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium shadow-sm">
          Рейтинг зафиксирован на релиз{" "}
          <span className="font-semibold text-foreground">
            {ratingReleaseDate ?? RATING_LOCK_DATE_LABEL}
          </span>
        </span>
        {isAdmin && (
          <span className="text-xs text-amber-700">
            Режим администратора — изменения сохраняются на сервере
          </span>
        )}
      </div>

      <div id="page-ds-participants-legend" className="mb-6 flex flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-sm">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.5)]" />
          <span>Участие подтверждено</span>
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
            {counts.confirmed}
          </span>
        </div>
        {counts.waitlist > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-sm">
            <span className="inline-block h-3 w-3 rounded-full bg-gray-300" />
            <span>Лист ожидания</span>
            <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
              {counts.waitlist}
            </span>
          </div>
        )}

        {(
          [
            { cat: "time" as const, count: counts.time },
            { cat: "vk" as const, count: counts.vk },
            { cat: "rating" as const, count: counts.rating },
            { cat: "ds2" as const, count: counts.ds2 },
          ] as const
        ).map(({ cat, count }) => {
          const cfg = CAT_CONFIG[cat];
          if (count === 0) return null;
          return (
            <div
              key={cat}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-sm"
            >
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badgeCls}`}>
                {cfg.label}
              </span>
              <span className="text-muted">— {cfg.description}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cfg.badgeCls}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div
        id="page-ds-participants-table-wrap"
        className={`overflow-x-auto rounded-xl border border-border bg-surface ${pending ? "opacity-70" : ""}`}
      >
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5 text-center w-6" title="Статус участия" />
              <th className="px-3 py-2.5 text-center w-8">#</th>
              <th className="px-3 py-2.5 text-left">Команда</th>
              <th className="px-1.5 py-2.5 text-center w-14 whitespace-nowrap" title="Подан состав">
                Состав
              </th>
              <th className="px-3 py-2.5 text-left hidden sm:table-cell">Город</th>
              <th className="px-3 py-2.5 text-right hidden sm:table-cell">Место</th>
              <th className="px-3 py-2.5 text-left">Категория</th>
              {isAdmin && <th className="px-2 py-2.5 w-16" />}
            </tr>
          </thead>
          <tbody>
            {displayList.map((p, idx) => {
              const cfg = CAT_CONFIG[p.category];
              const rowCls = p.inWaitlist ? "bg-gray-50/60" : cfg.rowCls;
              const prev = idx > 0 ? displayList[idx - 1] : null;
              const isFirstWaitlist = p.inWaitlist && (!prev || !prev.inWaitlist);
              const rowNum = p.inWaitlist
                ? waitlist.findIndex((w) => w.participantKey === p.participantKey) + 1
                : confirmed.findIndex((c) => c.participantKey === p.participantKey) + 1;
              const isBusy = busyKey === p.participantKey;
              const strike = p.adminRemoved;

              return (
                <Fragment key={p.participantKey}>
                  {isFirstWaitlist && (
                    <tr className="bg-muted/15">
                      <td
                        colSpan={isAdmin ? 8 : 7}
                        className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted"
                      >
                        Лист ожидания — {waitlist.length}{" "}
                        <span className="font-normal normal-case">(по рейтингу)</span>
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`border-b border-border/50 last:border-0 transition-colors hover:brightness-[0.97] ${rowCls} ${strike ? "opacity-60" : ""}`}
                  >
                    <td className="px-3 py-2 text-center">
                      <TrafficLight confirmed={!p.inWaitlist} />
                    </td>

                    <td className="px-3 py-2 text-center text-xs font-bold text-muted">
                      {rowNum}
                    </td>

                    <td className={`px-3 py-2 font-medium ${strike ? "line-through" : ""}`}>
                      <TeamNameCell
                        p={p}
                        isAdmin={isAdmin}
                        busy={isBusy}
                        onSave={(name) => handleDisplayName(p.participantKey, name)}
                      />
                    </td>

                    <td className="px-1.5 py-2 text-center">
                      {p.hasRoster ? (
                        <span title="Состав подан" className="inline-flex justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                        </span>
                      ) : (
                        <span title="Состав не подан" className="text-muted/40">
                          —
                        </span>
                      )}
                    </td>

                    <td
                      className={`px-3 py-2 text-muted hidden sm:table-cell ${strike ? "line-through" : ""}`}
                    >
                      {p.city || "—"}
                    </td>

                    <td className="px-3 py-2 text-right font-mono text-sm hidden sm:table-cell">
                      {p.ratingPosition !== null ? (
                        p.ratingPosition
                      ) : p.rating !== null ? (
                        p.rating
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5 items-start">
                        {p.adminConfirmed && (
                          <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap bg-green-100 text-green-700">
                            Добавлена организатором
                          </span>
                        )}
                        {p.category !== "none" && (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cfg.badgeCls}`}
                          >
                            {p.categoryLabel}
                          </span>
                        )}
                        {p.inBothDs && p.category !== "ds2" && (
                          <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap bg-amber-100 text-amber-700">
                            Участие в 2 DS
                          </span>
                        )}
                        {p.category === "none" && !p.inBothDs && !p.adminConfirmed && (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </div>
                    </td>

                    {isAdmin && (
                      <td className="px-2 py-2 text-center">
                        {isBusy ? (
                          <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted" />
                        ) : (
                          <div className="flex items-center justify-center gap-0.5">
                            {!p.adminRemoved && (
                              <button
                                type="button"
                                title={
                                  p.inWaitlist
                                    ? "Отметить как отзаявившуюся"
                                    : "Убрать из списка участников"
                                }
                                onClick={() => handleOverride(p.participantKey, "remove")}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                            {p.inWaitlist && (
                              <button
                                type="button"
                                title={
                                  p.adminRemoved
                                    ? "Вернуть в список участников"
                                    : "Добавить в список участников"
                                }
                                onClick={() => handleOverride(p.participantKey, "confirm")}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TeamNameCell({
  p,
  isAdmin,
  busy,
  onSave,
}: {
  p: DsDisplayParticipant;
  isAdmin: boolean;
  busy: boolean;
  onSave: (displayName: string | null) => Promise<boolean | void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const shown = participantShownName(p);
  const hasCustom = !!p.displayName && p.displayName !== p.officialName;

  function startEdit() {
    setValue(p.displayName ?? "");
    setEditing(true);
  }

  async function save(next: string | null) {
    const ok = await onSave(next);
    if (ok !== false) setEditing(false);
  }

  const nameEl =
    p.teamId > 0 ? (
      <a
        href={`https://rating.chgk.info/teams/${p.teamId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:text-accent transition-colors"
      >
        {shown}
        <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
      </a>
    ) : (
      <span>{shown}</span>
    );

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {nameEl}
        {hasCustom && (
          <span className="text-xs font-normal text-muted">({p.officialName})</span>
        )}
        {isAdmin && !editing && (
          <button
            type="button"
            title="Разовое название"
            disabled={busy}
            onClick={startEdit}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-accent/10 hover:text-accent transition-colors disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {isAdmin && editing && (
        <div className="flex flex-wrap items-center gap-1.5 font-normal">
          <input
            type="text"
            value={value}
            disabled={busy}
            autoFocus
            placeholder="Разовое название..."
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save(value.trim() || null);
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-52 max-w-full rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => save(value.trim() || null)}
            className="inline-flex items-center rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            Сохранить
          </button>
          {p.displayName && (
            <button
              type="button"
              disabled={busy}
              onClick={() => save(null)}
              className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs font-medium text-muted hover:bg-muted/20 transition-colors disabled:opacity-50"
            >
              Сбросить
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(false)}
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}
