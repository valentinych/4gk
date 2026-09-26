import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, Navigation, Trophy } from "lucide-react";
import { PageWidgetTiles } from "@/components/page-widgets/PageWidgetTiles";
import { OCHCH_WIDGET_PATH, ensureLandingWidgets, isPrismaMissingTable } from "@/lib/page-widgets";
import {
  OCHCH,
  OCHCH_CHANNEL_URL,
  OCHCH_DATE_LABEL,
  OCHCH_VENUE_MAIN,
  ensureOchchEvent,
} from "@/lib/ochch";

export const metadata: Metadata = {
  title: "ОЧЧ-2026",
  description:
    "Открытый Чемпионат Чехии по Что? Где? Когда? — 3–4 октября 2026, Прага.",
};

export default async function OchchPage() {
  if (process.env.DATABASE_URL) {
    try {
      await ensureLandingWidgets(OCHCH_WIDGET_PATH);
      await ensureOchchEvent();
    } catch (e) {
      if (!isPrismaMissingTable(e)) throw e;
    }
  }

  return (
    <div id="page-ochch" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/others"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Другие турниры
      </Link>

      <div id="page-ochch-header" className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
          <Trophy className="h-3.5 w-3.5" />
          Чемпионат
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          🇨🇿 {OCHCH.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {OCHCH.longTitle}. Фестиваль интеллектуальных игр в Праге.
        </p>
      </div>

      <div id="page-ochch-info-cards" className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <CalendarDays className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Даты</p>
              <p className="text-sm font-bold">{OCHCH_DATE_LABEL}</p>
            </div>
          </div>
        </div>
        <a
          href={OCHCH_VENUE_MAIN.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-sky-200 hover:bg-sky-50/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
            <MapPin className="h-4 w-4 text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">Место</p>
            <p className="text-sm font-bold leading-snug">{OCHCH_VENUE_MAIN.name}</p>
            <p className="mt-0.5 text-xs text-muted">{OCHCH_VENUE_MAIN.address}</p>
          </div>
          <Navigation className="h-4 w-4 shrink-0 text-muted" />
        </a>
      </div>

      <div id="page-ochch-tiles" className="mb-8">
        <PageWidgetTiles embedded />
      </div>

      <p className="text-center text-xs text-muted">
        Анонсы и регистрация — в{" "}
        <a
          href={OCHCH_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          канале ОЧЧ
        </a>
        .
      </p>
    </div>
  );
}
