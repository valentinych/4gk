import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, Trophy } from "lucide-react";
import { isPrismaMissingTable } from "@/lib/page-widgets";
import {
  PRAZMA,
  PRAZMA_BOARD_HREF,
  PRAZMA_DATE_LABEL,
  PRAZMA_TILES,
  ensurePrazmaEvent,
} from "@/lib/prazma";

export const metadata: Metadata = {
  title: PRAZMA.heading,
  description: `${PRAZMA.longTitle}. ${PRAZMA_DATE_LABEL}, ${PRAZMA.city}.`,
};

export default async function PrazmaPage() {
  if (process.env.DATABASE_URL) {
    try {
      await ensurePrazmaEvent();
    } catch (e) {
      if (!isPrismaMissingTable(e)) throw e;
    }
  }
  return (
    <div id="page-prazma" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/others"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Другие турниры
      </Link>

      <div id="page-prazma-header" className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
          <Trophy className="h-3.5 w-3.5" />
          Турнир
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          🇨🇿 {PRAZMA.heading}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {PRAZMA.longTitle}.
        </p>
      </div>

      <div id="page-prazma-info-cards" className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <CalendarDays className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Дата</p>
              <p className="text-sm font-bold">{PRAZMA_DATE_LABEL}</p>
              <p className="mt-0.5 text-xs text-muted">{PRAZMA.city}</p>
            </div>
          </div>
        </div>
        <a
          href={PRAZMA.ratingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-sky-200 hover:bg-sky-50/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
            <Trophy className="h-4 w-4 text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">Рейтинг</p>
            <p className="text-sm font-bold leading-snug">rating.chgk.info / 13490</p>
            <p className="mt-0.5 text-xs text-muted">Официальная страница турнира</p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted" />
        </a>
      </div>

      <Link
        id="page-prazma-board"
        href={PRAZMA_BOARD_HREF}
        className="group mb-8 flex items-center justify-between gap-4 rounded-xl border border-accent/30 bg-sky-50/60 p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
      >
        <div>
          <p className="text-base font-bold leading-snug transition-colors group-hover:text-accent">
            Табло результатов
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Таблица игры, как на 4gk.pl/prague.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-accent" />
      </Link>

      <div id="page-prazma-tiles" className="grid gap-3 sm:grid-cols-2">
        {PRAZMA_TILES.map((tile) =>
          tile.external ? (
            <a
              key={tile.slug}
              href={tile.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
            >
              <span className="mt-0.5 shrink-0 text-2xl leading-none" aria-hidden>
                {tile.emoji}
              </span>
              <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
                {tile.title}
              </span>
            </a>
          ) : (
            <Link
              key={tile.slug}
              href={tile.href}
              className="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
            >
              <span className="mt-0.5 shrink-0 text-2xl leading-none" aria-hidden>
                {tile.emoji}
              </span>
              <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
                {tile.title}
              </span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
