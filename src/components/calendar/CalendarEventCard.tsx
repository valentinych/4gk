"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Megaphone,
  Pencil,
  RotateCcw,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { getCityColor, type CalendarEvent } from "@/data/calendar";
import {
  eventUrl,
  formatEventDateTime,
  isDzikiSopotEvent,
  TYPE_LABELS,
} from "@/lib/calendar-display";
import { isDsFridaySync } from "@/lib/ds-friday-syncs";
import { formatWarsawShort } from "@/lib/time";

const formatShortDateTime = (iso: string) => formatWarsawShort(iso);

export function CalendarEventCard({
  event,
  canManage,
  deleting,
  onDelete,
  onEdit,
  isLoggedIn,
  hasMyRoster,
  isRegistered,
  isWithdrawn,
  rosterCount,
  teamCount,
}: {
  event: CalendarEvent;
  canManage?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  isLoggedIn?: boolean;
  hasMyRoster?: boolean;
  isRegistered?: boolean;
  isWithdrawn?: boolean;
  rosterCount?: number;
  teamCount?: number;
}) {
  const c = getCityColor(event.city);

  const rosterState = hasMyRoster
    ? "submitted"
    : isRegistered
      ? "no-roster"
      : "none";

  return (
    <div className={`rounded-xl border bg-surface p-4 transition-all hover:shadow-sm ${c.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${c.bg} ${c.text} ${c.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
              {event.city}
            </span>
            <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
              {TYPE_LABELS[event.type] ?? event.type}
            </span>
          </div>
          <Link
            href={eventUrl(event)}
            className="mt-2 block text-sm font-bold leading-snug hover:underline decoration-foreground/30 underline-offset-2"
          >
            {event.title}
          </Link>
          {event.description && (
            <p className="mt-1 text-xs leading-relaxed text-muted">{event.description}</p>
          )}
        </div>
        {canManage && onEdit && onDelete && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              title="Редактировать"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
              title="Удалить"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatEventDateTime(event.startDate, event.endDate, event.startTime, event.endTime)}
        </span>
        {event.venue &&
          (event.venueMapUrl ? (
            <a
              href={event.venueMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline decoration-muted/30 underline-offset-2 transition-colors hover:text-foreground"
            >
              <MapPin className="h-3.5 w-3.5" />
              {event.venue}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.venue}
            </span>
          ))}
      </div>

      {(event.registrationOpensAt || event.registrationClosesAt || event.participantLimit != null) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          {event.registrationOpensAt && (
            <span>Приём с {formatShortDateTime(event.registrationOpensAt)}</span>
          )}
          {event.registrationClosesAt && (
            <span>до {formatShortDateTime(event.registrationClosesAt)}</span>
          )}
          {event.participantLimit != null && (
            <span>
              · Лимит {event.participantLimit}
              {(teamCount ?? 0) >= event.participantLimit && (
                <span className="ml-1 font-semibold text-amber-700">(достигнут)</span>
              )}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {event.registrationLink && (
          <a
            href={event.registrationLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface ${c.text} ${c.border}`}
          >
            Регистрация
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {event.mediaLink && (
          <a
            href={event.mediaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <Megaphone className="h-3 w-3" />
            {event.mediaLinkLabel || "Медиа"}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {event.ratingUrl && (
          <a
            href={event.ratingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            Сайт рейтинга
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {isLoggedIn &&
          !isDzikiSopotEvent(event) &&
          (() => {
            const nowMs = Date.now();
            const opens = event.registrationOpensAt
              ? new Date(event.registrationOpensAt).getTime()
              : null;
            const closes = event.registrationClosesAt
              ? new Date(event.registrationClosesAt).getTime()
              : null;
            const notYetOpen = opens !== null && nowMs < opens;
            const closedByTime = closes !== null && nowMs > closes;
            const limitReached =
              event.participantLimit != null && (teamCount ?? 0) >= event.participantLimit;
            const hardClosed = limitReached && !!event.closeOnLimit;
            const willReserve = limitReached && !event.closeOnLimit;
            const blockedReason = notYetOpen
              ? "Приём заявок ещё не открыт"
              : closedByTime
                ? "Приём заявок закрыт"
                : hardClosed
                  ? "Лимит команд достигнут"
                  : null;

            if (isRegistered) {
              return (
                <Link
                  href={eventUrl(event, "withdraw")}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                >
                  <UserMinus className="h-3 w-3" />
                  Отзаявиться
                </Link>
              );
            }

            if (blockedReason) {
              return (
                <span
                  title={blockedReason}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted cursor-not-allowed"
                >
                  <UserPlus className="h-3 w-3" />
                  {blockedReason}
                </span>
              );
            }

            if (isWithdrawn) {
              return (
                <Link
                  href={eventUrl(event, "join")}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                >
                  <RotateCcw className="h-3 w-3" />
                  {willReserve ? "Заявиться в резерв" : "Перезаявиться"}
                </Link>
              );
            }

            return (
              <Link
                href={eventUrl(event, "join")}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  willReserve
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-accent/30 bg-accent/5 text-accent hover:bg-accent/10"
                }`}
              >
                <UserPlus className="h-3 w-3" />
                {willReserve ? "Заявиться в резерв" : "Заявиться"}
              </Link>
            );
          })()}
        {!isLoggedIn && isDsFridaySync(event.id) && (
          <Link
            href={eventUrl(event)}
            className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
          >
            <UserPlus className="h-3 w-3" />
            Заявиться
          </Link>
        )}
        {isLoggedIn && (
          <Link
            href={`/account/roster/${event.id}`}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              rosterState === "submitted"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : rosterState === "no-roster"
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-border text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {rosterState === "submitted" ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Изменить состав
              </>
            ) : rosterState === "no-roster" ? (
              <>
                <Users className="h-3 w-3" />
                Состав не подан
              </>
            ) : (
              <>
                <Users className="h-3 w-3" />
                Подать состав
              </>
            )}
          </Link>
        )}
      </div>

      {((teamCount ?? 0) > 0 || (canManage && (rosterCount ?? 0) > 0)) && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          {(teamCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Users className="h-3.5 w-3.5" />
              {teamCount}{" "}
              {teamCount === 1 ? "команда" : teamCount! < 5 ? "команды" : "команд"} заявилось
            </span>
          )}
          {canManage && (rosterCount ?? 0) > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {rosterCount}{" "}
                {rosterCount === 1 ? "состав" : rosterCount! < 5 ? "состава" : "составов"} подано
              </span>
              <a
                href={`/api/roster/${event.id}/csv`}
                download
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <Download className="h-3 w-3" />
                CSV
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
