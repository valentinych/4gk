"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { getCityColor, type CalendarEvent } from "@/data/calendar";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import {
  buildEventMap,
  dateKey,
  getMonthDays,
  isPastEvent,
  monthEventsFor,
  MONTHS_RU,
  parseDate,
  WEEKDAYS,
} from "@/lib/calendar-display";

export interface CalendarWidgetProps {
  idPrefix?: string;
  persistDaySelection?: boolean;
  cityFilterStorageKey?: string;
  canManageEvents?: boolean;
  deletingId?: string | null;
  refreshToken?: number;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: string) => void;
  onEventsLoaded?: () => void;
}

export function CalendarWidget({
  idPrefix = "calendar-widget",
  persistDaySelection = false,
  cityFilterStorageKey = "calendar-city-filter",
  canManageEvents = false,
  deletingId = null,
  refreshToken = 0,
  onEditEvent,
  onDeleteEvent,
  onEventsLoaded,
}: CalendarWidgetProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;
  const canManage = canManageEvents && (role === "ADMIN" || role === "ORGANIZER");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!persistDaySelection || typeof window === "undefined") return;
    const saved = sessionStorage.getItem("calendar-selected-day");
    if (!saved) return;
    setSelectedDay(saved);
    const d = parseDate(saved);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }, [persistDaySelection]);

  useEffect(() => {
    if (!persistDaySelection || typeof window === "undefined") return;
    if (selectedDay === null) sessionStorage.removeItem("calendar-selected-day");
    else sessionStorage.setItem("calendar-selected-day", selectedDay);
  }, [persistDaySelection, selectedDay]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rosterCounts, setRosterCounts] = useState<Record<string, number>>({});
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [myRosterEventIds, setMyRosterEventIds] = useState<string[]>([]);
  const [myRegisteredEventIds, setMyRegisteredEventIds] = useState<string[]>([]);
  const [myWithdrawnEventIds, setMyWithdrawnEventIds] = useState<string[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/calendar");
      if (res.ok) {
        setEvents(await res.json());
        setLoadError(null);
      } else {
        setEvents([]);
        setLoadError("Не удалось загрузить события. Попробуйте обновить страницу.");
      }
    } catch {
      setEvents([]);
      setLoadError("Не удалось загрузить события. Попробуйте обновить страницу.");
    } finally {
      setLoading(false);
      onEventsLoaded?.();
    }
  }, [onEventsLoaded]);

  const fetchRosterCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/roster/counts");
      if (res.ok) {
        const data = await res.json();
        setRosterCounts(data.counts ?? {});
        setTeamCounts(data.teamCounts ?? {});
        setMyRosterEventIds(data.mine ?? []);
        setMyRegisteredEventIds(data.registered ?? []);
        setMyWithdrawnEventIds(data.withdrawn ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, refreshToken]);

  useEffect(() => {
    fetchRosterCounts();
  }, [fetchRosterCounts]);

  const usedCities = useMemo(() => {
    const cities = new Set<string>();
    for (const ev of events) cities.add(ev.city);
    return Array.from(cities).sort();
  }, [events]);

  const [selectedCities, setSelectedCities] = useState<Set<string> | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(cityFilterStorageKey);
      if (!raw) return null;
      const arr = JSON.parse(raw) as string[];
      return Array.isArray(arr) && arr.length > 0 ? new Set(arr) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (selectedCities === null) {
      localStorage.removeItem(cityFilterStorageKey);
    } else {
      localStorage.setItem(cityFilterStorageKey, JSON.stringify([...selectedCities]));
    }
  }, [cityFilterStorageKey, selectedCities]);

  useEffect(() => {
    if (usedCities.length === 0 || selectedCities === null) return;
    const valid = new Set([...selectedCities].filter((c) => usedCities.includes(c)));
    if (valid.size === 0 || valid.size === usedCities.length) {
      setSelectedCities(null);
    } else if (valid.size !== selectedCities.size) {
      setSelectedCities(valid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedCities]);

  const filteredEvents = useMemo(
    () => (selectedCities === null ? events : events.filter((ev) => selectedCities.has(ev.city))),
    [events, selectedCities],
  );

  const hiddenCount = events.length - filteredEvents.length;
  const eventMap = useMemo(() => buildEventMap(filteredEvents), [filteredEvents]);
  const cells = useMemo(() => getMonthDays(year, month), [year, month]);

  const todayStartMs = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const monthEvents = useMemo(
    () => monthEventsFor(filteredEvents, year, month, todayStartMs),
    [filteredEvents, year, month, todayStartMs],
  );

  const selectedEvents = selectedDay ? (eventMap.get(selectedDay) ?? []) : [];
  const todayKey = dateKey(today);

  const isTodayFilterActive =
    selectedDay === todayKey && year === today.getFullYear() && month === today.getMonth();

  const todayEventsCount = (eventMap.get(todayKey) ?? []).length;

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
    setSelectedDay(null);
  }

  function toggleTodayFilter() {
    if (isTodayFilterActive) {
      setSelectedDay(null);
      return;
    }
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(todayKey);
  }

  function toggleCity(city: string) {
    if (selectedCities === null) {
      setSelectedCities(new Set([city]));
      return;
    }
    const all = new Set(usedCities);
    const next = new Set(selectedCities);
    if (next.has(city)) next.delete(city);
    else next.add(city);
    setSelectedCities(next.size === 0 || next.size === all.size ? null : next);
  }

  function selectAllCities() {
    setSelectedCities(null);
  }

  const isCityVisible = (city: string) => selectedCities === null || selectedCities.has(city);

  const sidebarEvents = selectedDay ? selectedEvents : monthEvents;

  return (
    <>
      <div id={`${idPrefix}-day-filter`} className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Показать:</span>
        <button
          type="button"
          onClick={toggleTodayFilter}
          title={isTodayFilterActive ? "Показать весь месяц" : "События на сегодня"}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
            isTodayFilterActive
              ? "border-accent bg-accent text-white hover:bg-accent-hover"
              : "border-border bg-surface text-foreground hover:bg-surface/80"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Сегодня
          {todayEventsCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-px text-[10px] font-semibold leading-none ${
                isTodayFilterActive ? "bg-white/20" : "bg-accent/10 text-accent"
              }`}
            >
              {todayEventsCount}
            </span>
          )}
        </button>
      </div>

      {usedCities.length > 0 && (
        <div id={`${idPrefix}-city-filter`} className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Площадки:</span>
            {usedCities.map((city) => {
              const c = getCityColor(city);
              const active = isCityVisible(city);
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => toggleCity(city)}
                  title={active ? `Скрыть ${city}` : `Показать ${city}`}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? `${c.bg} ${c.text} ${c.border} hover:brightness-95`
                      : "border-border bg-surface text-muted/50 line-through opacity-50 hover:opacity-70"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full transition-opacity ${c.dot} ${active ? "" : "opacity-30"}`}
                  />
                  {city}
                </button>
              );
            })}
            {selectedCities !== null && (
              <button
                type="button"
                onClick={selectAllCities}
                className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <X className="h-3 w-3" />
                Сбросить фильтр
              </button>
            )}
          </div>
          {hiddenCount > 0 && (
            <p className="mt-2 text-xs text-muted/70">
              {hiddenCount === 1
                ? "1 мероприятие скрыто"
                : hiddenCount < 5
                  ? `${hiddenCount} мероприятия скрыто`
                  : `${hiddenCount} мероприятий скрыто`}
              {" · "}
              <button
                type="button"
                onClick={selectAllCities}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Показать все
              </button>
            </p>
          )}
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}

      {loading ? (
        <div id={`${idPrefix}-loading`} className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : (
        <div id={`${idPrefix}-main`} className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div id={`${idPrefix}-grid`} className="rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  {MONTHS_RU[month]} {year}
                </h2>
                {(year !== today.getFullYear() || month !== today.getMonth()) && (
                  <button
                    type="button"
                    onClick={toggleTodayFilter}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                  >
                    Сегодня
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-2.5 text-center text-xs font-medium text-muted">
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="border-b border-r border-border/50 bg-surface/30 p-2"
                      style={{ minHeight: 72 }}
                    />
                  );
                }

                const key = dateKey(cell);
                const dayEvents = eventMap.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                const isWeekend = cell.getDay() === 0 || cell.getDay() === 6;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={`border-b border-r border-border/50 p-2 text-left transition-colors hover:bg-surface/80 ${
                      isSelected ? "bg-surface ring-2 ring-accent/20 ring-inset" : ""
                    }`}
                    style={{ minHeight: 72 }}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-accent text-white"
                          : isWeekend
                            ? "text-muted/60"
                            : "text-foreground"
                      }`}
                    >
                      {cell.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {dayEvents.map((ev) => {
                          const c = getCityColor(ev.city);
                          return (
                            <span
                              key={ev.id}
                              className={`hidden h-1.5 rounded-full sm:block ${c.dot}`}
                              style={{ width: "100%", maxWidth: 48 }}
                            />
                          );
                        })}
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted sm:hidden">
                          {dayEvents.length}{" "}
                          {dayEvents.length === 1 ? "событие" : "события"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div id={`${idPrefix}-sidebar`} className="space-y-3">
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <X className="h-3 w-3" />
                Сбросить фильтр дня · показать весь месяц
              </button>
            )}

            <h3 className="text-sm font-bold text-muted">
              {selectedDay
                ? `События ${parseDate(selectedDay).getDate()} ${MONTHS_RU[parseDate(selectedDay).getMonth()].toLowerCase()}`
                : `События за ${MONTHS_RU[month].toLowerCase()}`}
            </h3>

            {sidebarEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted/30" />
                <p className="mt-2 text-xs text-muted/60">Нет событий</p>
              </div>
            ) : (
              sidebarEvents.map((ev) => {
                const past = isPastEvent(ev, todayStartMs);
                return (
                  <div
                    key={ev.id}
                    className={
                      past
                        ? "opacity-50 grayscale transition-opacity hover:opacity-100 hover:grayscale-0"
                        : ""
                    }
                  >
                    <CalendarEventCard
                      event={ev}
                      canManage={canManage}
                      deleting={deletingId === ev.id}
                      onDelete={onDeleteEvent ? () => onDeleteEvent(ev.id) : undefined}
                      onEdit={onEditEvent ? () => onEditEvent(ev) : undefined}
                      isLoggedIn={isLoggedIn}
                      hasMyRoster={myRosterEventIds.includes(ev.id)}
                      isRegistered={myRegisteredEventIds.includes(ev.id)}
                      isWithdrawn={myWithdrawnEventIds.includes(ev.id)}
                      rosterCount={rosterCounts[ev.id] ?? 0}
                      teamCount={teamCounts[ev.id] ?? 0}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
