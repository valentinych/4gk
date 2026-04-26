import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { AMATEUR_TOURNAMENTS } from "@/lib/amateur";

export const metadata: Metadata = {
  title: "Любительские турниры",
  description:
    "Любительские турниры по интеллектуальным играм в Польше — для начинающих команд.",
};

export default function AmateurPage() {
  const upcoming = AMATEUR_TOURNAMENTS.filter((t) => t.status === "upcoming");
  const past = AMATEUR_TOURNAMENTS.filter((t) => t.status === "past");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-lime-100 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
          <Sparkles className="h-3.5 w-3.5" />
          Любительские турниры
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          🌿 Любительские турниры
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Турниры для начинающих команд — низкий порог входа, дружелюбная атмосфера.
        </p>
      </div>

      {upcoming.length > 0 && (
        <Section title="Ближайшие" tournaments={upcoming} />
      )}
      {past.length > 0 && <Section title="Прошедшие" tournaments={past} />}

      {AMATEUR_TOURNAMENTS.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-sm text-muted">
          Турниры пока не анонсированы
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tournaments,
}: {
  title: string;
  tournaments: typeof AMATEUR_TOURNAMENTS;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold tracking-tight">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {tournaments.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl leading-none" aria-hidden>
                {t.emoji}
              </span>
              <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-snug group-hover:text-accent transition-colors">
                {t.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {t.description}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-lime-100 bg-lime-50 px-1.5 py-0.5 text-[10px] font-medium text-lime-700">
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
