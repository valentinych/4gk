import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Trophy } from "lucide-react";
import {
  OCHP_2027_TILES,
  OCHP_REGISTRATION_DATES,
  OCHP_REGISTRATION_PLACE,
  OCHP_REGISTRATION_YEAR,
  OCHP_SEASON_START_MAX,
  formatOchpSeasonRange,
  ochpLandingTileHref,
} from "@/lib/ochp-seasons";
import {
  OCHP_WIDGET_PATH,
  ensureLandingWidgets,
  isPrismaMissingTable,
} from "@/lib/page-widgets";
import { Ochp2027Client } from "./Ochp2027Client";
import { OchpPageClient, OchpSeasonMenu } from "./OchpPageClient";

const MAPS_URL = "https://maps.app.goo.gl/UUrCs4oQ9ACjJTZbA";

export function ochpYearMetadata(year: number): Metadata {
  if (year === OCHP_REGISTRATION_YEAR) {
    return {
      title: "ОЧП 2027",
      description: "Открытый чемпионат Польши 2027 — место проведения и приём заявок.",
    };
  }
  return {
    title: `ОЧП ${year}`,
    description: `Открытый чемпионат Польши, сезон ${formatOchpSeasonRange(year - 1)}.`,
  };
}

export async function OchpYearView({ year }: { year: number }) {
  if (year !== OCHP_REGISTRATION_YEAR) {
    const seasonStart = year - 1;
    if (seasonStart === OCHP_SEASON_START_MAX && process.env.DATABASE_URL) {
      try {
        await ensureLandingWidgets(OCHP_WIDGET_PATH);
      } catch (e) {
        const name =
          typeof e === "object" && e !== null && "name" in e
            ? String((e as { name?: unknown }).name)
            : "";
        if (name !== "PrismaClientInitializationError" && !isPrismaMissingTable(e)) throw e;
      }
    }
    return (
      <OchpPageClient
        seasonStart={seasonStart}
        widgetPath={
          seasonStart === OCHP_SEASON_START_MAX ? OCHP_WIDGET_PATH : undefined
        }
      />
    );
  }

  return (
    <div id="page-ochp" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header id="page-ochp-header" className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Чемпионат
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ОЧП 2027</h1>
              <p id="page-ochp-dates" className="text-sm font-medium text-muted sm:text-base">
                {OCHP_REGISTRATION_DATES}
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Открытый чемпионат Польши по интеллектуальным играм.
            </p>
            <p id="page-ochp-venue" className="mt-4 text-sm">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
              >
                Место проведения игр
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">(новая вкладка)</span>
              </a>
              <span className="text-muted"> — {OCHP_REGISTRATION_PLACE}</span>
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
      <div id="page-ochp-controls" className="mb-8 grid gap-4 sm:grid-cols-2">
        <OchpSeasonMenu selectedYear={OCHP_REGISTRATION_YEAR} />
      </div>
      <div id="page-ochp-tiles" className="mb-8 grid gap-3 sm:grid-cols-2">
        {OCHP_2027_TILES.map((tile) => (
          <Link
            key={tile.slug}
            href={ochpLandingTileHref(tile)}
            className="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
          >
            <span className="mt-0.5 shrink-0 text-2xl leading-none" aria-hidden="true">
              {tile.emoji}
            </span>
            <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
              {tile.title}
            </span>
          </Link>
        ))}
      </div>
      <Ochp2027Client />
    </div>
  );
}
