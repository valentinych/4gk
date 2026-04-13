import { Calendar, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { DS_YEARS, dsYearLabel } from "@/lib/dziki-sopot-seasons";

export const metadata: Metadata = {
  title: "Dziki Sopot",
  description: "Турнир по интеллектуальным играм Dziki Sopot",
};

const archiveTiles = DS_YEARS.flatMap((year) => [
  {
    href: `/dziki-sopot/rating-page?year=${year}`,
    emoji: "📋",
    title: `Страница турнира на рейтинге`,
    label: dsYearLabel(year),
  },
  {
    href: `/dziki-sopot/results-chgk?year=${year}`,
    emoji: "📊",
    title: `Результаты ЧГК`,
    label: dsYearLabel(year),
  },
]);

export default function DzikiSopotPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Trophy className="h-3.5 w-3.5" />
          Турнир
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dziki Sopot</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Международный турнир по интеллектуальным играм. 4–6 сентября 2026 года.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <MapPin className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">МПИ</p>
              <a
                href="https://maps.app.goo.gl/VcCgeraDBsJ1La7R6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-accent hover:underline"
              >
                Aquapark Sopot
              </a>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Calendar className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Дата</p>
              <p className="text-sm font-bold">4–6 сентября 2026</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="https://forms.gle/oyfmJnro1q9S2Ydj8"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3.5 rounded-xl border border-border bg-white p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
        >
          <span className="mt-0.5 shrink-0 text-2xl leading-none">📝</span>
          <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
            Регистрация
          </span>
        </a>
      </div>

      {/* Archive results by year */}
      <div>
        <h2 className="mb-4 text-base font-bold">Архив результатов</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {archiveTiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex items-start gap-3.5 rounded-xl border border-border bg-white p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="mt-0.5 shrink-0 text-2xl leading-none">{tile.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-accent">{tile.label}</p>
                <p className="text-sm font-medium leading-snug transition-colors group-hover:text-accent">
                  {tile.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
