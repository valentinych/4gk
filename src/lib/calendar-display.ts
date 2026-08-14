import type { CalendarEvent } from "@/data/calendar";
import { isDsFridaySync } from "@/lib/ds-friday-syncs";

export const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const TYPE_LABELS: Record<string, string> = {
  "multi-day": "Многодневный",
  "one-day": "Однодневный",
  "sync-chgk": "Синхрон ЧГК",
  si: "ИСИ",
  "brain-ring": "Брейн-Ринг",
  other: "Другое",
  tournament: "Турнир",
  sync: "Синхрон",
  league: "Лига",
};

export function isDzikiSopotEvent(event: { id: string; title: string }) {
  return (
    event.id === "cmmw82nst000asf012sw62tlo" ||
    event.title.trim().toLowerCase() === "dziki sopot"
  );
}

export function eventUrl(
  event: { id: string; title: string },
  action?: "join" | "withdraw",
): string {
  if (event.id === "mazowieckie-syreny-lite") {
    return action ? "/mazowieckie-syreny-lite/participants" : "/mazowieckie-syreny-lite";
  }
  if (isDzikiSopotEvent(event)) {
    return action ? "/dziki-sopot/participants" : "/dziki-sopot";
  }
  if (isDsFridaySync(event.id)) {
    return `/calendar/${event.id}`;
  }
  return action
    ? `/calendar/${event.id}?action=${action}`
    : `/calendar/${event.id}`;
}

export function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toDateKey(isoOrDateStr: string) {
  return isoOrDateStr.slice(0, 10);
}

export function parseDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function eachDay(start: string, end?: string | null): string[] {
  const startKey = toDateKey(start);
  const days: string[] = [startKey];
  if (!end) return days;
  const endKey = toDateKey(end);
  const s = parseDate(startKey);
  const e = parseDate(endKey);
  const cur = new Date(s);
  cur.setDate(cur.getDate() + 1);
  while (cur <= e) {
    days.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function buildEventMap(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    for (const day of eachDay(ev.startDate, ev.endDate)) {
      const list = map.get(day) ?? [];
      list.push(ev);
      map.set(day, list);
    }
  }
  return map;
}

export function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const remainder = cells.length % 7;
  if (remainder) {
    for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  }
  return cells;
}

export function formatEventDateTime(
  start: string,
  end?: string | null,
  startTime?: string | null,
  endTime?: string | null,
) {
  const s = parseDate(start);
  const e = end ? parseDate(end) : null;

  const sameDay = !e || s.getTime() === e.getTime();
  const sameMonth = e && s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();

  if (sameDay) {
    let result = `${s.getDate()} ${MONTHS_GEN[s.getMonth()]}`;
    if (startTime) {
      result += ` ${startTime}`;
      if (endTime) result += `–${endTime}`;
    }
    return result;
  }

  if (startTime || endTime) {
    const startStr = `${s.getDate()} ${MONTHS_GEN[s.getMonth()]}${startTime ? ` ${startTime}` : ""}`;
    const endStr = `${e!.getDate()} ${MONTHS_GEN[e!.getMonth()]}${endTime ? ` ${endTime}` : ""}`;
    return `${startStr} – ${endStr}`;
  }

  if (sameMonth) {
    return `${s.getDate()}–${e!.getDate()} ${MONTHS_GEN[s.getMonth()]}`;
  }
  return `${s.getDate()} ${MONTHS_GEN[s.getMonth()]} – ${e!.getDate()} ${MONTHS_GEN[e!.getMonth()]}`;
}

export function isPastEvent(ev: CalendarEvent, todayStartMs: number) {
  const endStr = ev.endDate ?? ev.startDate;
  return parseDate(endStr).getTime() < todayStartMs;
}

export function monthEventsFor(
  events: CalendarEvent[],
  year: number,
  month: number,
  todayStartMs: number,
): CalendarEvent[] {
  const seen = new Set<string>();
  const result: CalendarEvent[] = [];
  for (const ev of events) {
    const s = parseDate(ev.startDate);
    const e = ev.endDate ? parseDate(ev.endDate) : s;
    if (
      (s.getFullYear() === year && s.getMonth() === month) ||
      (e.getFullYear() === year && e.getMonth() === month)
    ) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        result.push(ev);
      }
    }
  }
  const upcoming = result
    .filter((ev) => !isPastEvent(ev, todayStartMs))
    .sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());
  const past = result
    .filter((ev) => isPastEvent(ev, todayStartMs))
    .sort((a, b) => parseDate(b.startDate).getTime() - parseDate(a.startDate).getTime());
  return [...upcoming, ...past];
}
