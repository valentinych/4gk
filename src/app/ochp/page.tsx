import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink, Trophy } from "lucide-react";
import { OCHP_WIDGET_PATH, ensureLandingWidgets, isPrismaMissingTable } from "@/lib/page-widgets";
import {
  OCHP_SEASON_START_MAX,
  formatOchpChampionshipYear,
  formatOchpSeasonRange,
  parseOchpSeasonStartOptional,
} from "@/lib/ochp-seasons";
import { Ochp2027Client } from "./Ochp2027Client";
import { OCHP_REGISTRATION_YEAR, OchpPageClient, OchpSeasonMenu } from "./OchpPageClient";

const MAPS_URL = "https://maps.app.goo.gl/UUrCs4oQ9ACjJTZbA";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const seasonStart = parseOchpSeasonStartOptional(sp.season);
  if (seasonStart == null) {
    return {
      title: "ОЧП 2027",
      description: "Открытый чемпионат Польши 2027 — место проведения и приём заявок.",
    };
  }
  const year = formatOchpChampionshipYear(seasonStart);
  return {
    title: `ОЧП ${year}`,
    description: `Открытый чемпионат Польши, сезон ${formatOchpSeasonRange(seasonStart)}.`,
  };
}

export default async function OchpPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const sp = await searchParams;
  const seasonStart = parseOchpSeasonStartOptional(sp.season);

  if (seasonStart != null) {
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
    return <OchpPageClient seasonStart={seasonStart} />;
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
                16–18 апреля 2027
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
              <span className="text-muted"> — ADN Conference Center</span>
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
      <Ochp2027Client />
    </div>
  );
}
