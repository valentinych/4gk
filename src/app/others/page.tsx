import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy } from "lucide-react";
import { OTHER_TOURNAMENTS } from "@/lib/other-tournaments";

export const metadata: Metadata = {
  title: "Другие турниры",
  description:
    "Турниры вне польских лиг портала — ОЧЧ, Пражма и другие фестивали.",
};

export default function OthersPage() {
  const upcoming = OTHER_TOURNAMENTS.filter((t) => t.status === "upcoming");
  const past = OTHER_TOURNAMENTS.filter((t) => t.status === "past");

  return (
    <div id="page-others" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div id="page-others-header" className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
          <Trophy className="h-3.5 w-3.5" />
          Другие турниры
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Другие турниры
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Фестивали и чемпионаты за пределами регулярных лиг Польши.
        </p>
      </div>

      {upcoming.length > 0 && (
        <Section title="Ближайшие" tournaments={upcoming} />
      )}
      {past.length > 0 && <Section title="Прошедшие" tournaments={past} />}
    </div>
  );
}

function Section({
  title,
  tournaments,
}: {
  title: string;
  tournaments: typeof OTHER_TOURNAMENTS;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold tracking-tight">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {tournaments.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl leading-none" aria-hidden>
                {t.emoji}
              </span>
              <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-snug transition-colors group-hover:text-accent">
                {t.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {t.description}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                <CalendarDays className="h-3 w-3" />
                {t.dateLabel}
              </span>
              {t.cities.map((city) => (
                <span
                  key={city}
                  className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted"
                >
                  {city}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
