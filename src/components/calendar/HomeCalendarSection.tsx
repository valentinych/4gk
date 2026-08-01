"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CalendarWidget } from "@/components/calendar/CalendarWidget";

export function HomeCalendarSection() {
  return (
    <section id="page-home-calendar" className="border-y border-border py-12">
      <div id="page-home-calendar-inner" className="mx-auto max-w-6xl px-4 sm:px-6">
        <div id="page-home-calendar-header" className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Календарь</h2>
            <p className="mt-2 text-muted">
              Расписание интеллектуальных игр и турниров в Польше
            </p>
          </div>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:border-border-hover hover:shadow-sm"
          >
            Весь календарь
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <CalendarWidget
          idPrefix="page-home-calendar"
          cityFilterStorageKey="home-calendar-city-filter"
        />
      </div>
    </section>
  );
}
