import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Trophy } from "lucide-react";
import { isPrismaMissingTable } from "@/lib/page-widgets";
import {
  OCHB,
  OCHB_CHANNEL_URL,
  OCHB_DATE_LABEL,
  OCHB_EDITORS,
  OCHB_ORG_COMMITTEE,
  OCHB_RATING_TOURNAMENT_ID,
  OCHB_TILES,
  OCHB_TOURS_LABEL,
  ensureOchbEvent,
  ochbRatingPublicUrl,
} from "@/lib/ochb";

export const metadata: Metadata = {
  title: OCHB.title,
  description: `${OCHB.longTitle}. ${OCHB_DATE_LABEL}, ${OCHB.city}.`,
};

export default async function OchbPage() {
  if (process.env.DATABASE_URL) {
    try {
      await ensureOchbEvent();
    } catch (e) {
      if (!isPrismaMissingTable(e)) throw e;
    }
  }

  return (
    <div id="page-ochb" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/others"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Другие турниры
      </Link>

      <div id="page-ochb-header" className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
          <Trophy className="h-3.5 w-3.5" />
          Чемпионат
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          🇪🇸 {OCHB.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{OCHB.longTitle}</p>
        <p className="mt-1 text-sm text-muted">{OCHB.city}</p>
      </div>

      <div id="page-ochb-info-cards" className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <CalendarDays className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Даты</p>
              <p className="text-sm font-bold">{OCHB_DATE_LABEL}</p>
            </div>
          </div>
        </div>
        <a
          href={ochbRatingPublicUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-sky-200 hover:bg-sky-50/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
            <Trophy className="h-4 w-4 text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">Рейтинг</p>
            <p className="text-sm font-bold leading-snug">
              rating.chgk.info / {OCHB_RATING_TOURNAMENT_ID}
            </p>
            <p className="mt-0.5 text-xs text-muted">Официальная страница турнира</p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted" />
        </a>
      </div>

      <div
        id="page-ochb-facts"
        className="mb-8 rounded-xl border border-border bg-surface p-5 text-sm"
      >
        <p className="text-xs text-muted">
          По данным{" "}
          <a
            href={ochbRatingPublicUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            rating.chgk.info
          </a>
        </p>
        <p className="mt-2 font-medium">{OCHB_TOURS_LABEL}</p>
        <p className="mt-3 text-xs text-muted">Оргкомитет</p>
        <p className="mt-0.5">{OCHB_ORG_COMMITTEE.join(", ")}</p>
        <p className="mt-3 text-xs text-muted">Редакторы</p>
        <ol className="mt-0.5 space-y-0.5">
          {OCHB_EDITORS.map((name, i) => (
            <li key={name}>
              <span className="font-mono text-xs text-muted/60">{i + 1}. </span>
              {name}
            </li>
          ))}
        </ol>
      </div>

      <div id="page-ochb-tiles" className="mb-8 grid gap-3 sm:grid-cols-2">
        {OCHB_TILES.map((tile) =>
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

      <p className="text-center text-xs text-muted">
        Анонсы — в{" "}
        <a
          href={OCHB_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          канале ОЧБ
        </a>
        .
      </p>
    </div>
  );
}
