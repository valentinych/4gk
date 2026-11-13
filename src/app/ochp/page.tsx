import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import {
  formatOchpChampionshipYear,
  ochpChampionshipYearList,
  ochpYearHref,
  ochpYearIndexLine,
  parseOchpSeasonStartOptional,
} from "@/lib/ochp-seasons";

export const metadata: Metadata = {
  title: "ОЧП",
  description:
    "Открытый чемпионат Польши по интеллектуальным играм — годы проведения.",
};

export default async function OchpIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const sp = await searchParams;
  const seasonStart = parseOchpSeasonStartOptional(sp.season);
  if (seasonStart != null) {
    redirect(`/ochp/${formatOchpChampionshipYear(seasonStart)}`);
  }

  const years = ochpChampionshipYearList();

  return (
    <div id="page-ochp" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header id="page-ochp-header" className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Чемпионат
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ОЧП</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Открытый чемпионат Польши по интеллектуальным играм.
            </p>
          </div>
          <Image
            src="/ochp-logo.png"
            alt=""
            width={80}
            height={100}
            className="hidden shrink-0 sm:block"
          />
        </div>
      </header>

      <div id="page-ochp-years" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {years.map((year) => {
          const line = ochpYearIndexLine(year);
          return (
            <Link
              key={year}
              href={ochpYearHref(year)}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
            >
              <span className="text-2xl font-bold tracking-tight transition-colors group-hover:text-accent">
                {year}
              </span>
              {line ? (
                <span className="text-sm leading-relaxed text-muted">{line}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
