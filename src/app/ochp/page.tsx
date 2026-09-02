import { Suspense } from "react";
import type { Metadata } from "next";
import { OCHP_WIDGET_PATH, ensureLandingWidgets, isPrismaMissingTable } from "@/lib/page-widgets";
import { OchpPageClient } from "./OchpPageClient";

export const metadata: Metadata = {
  title: "ОЧП",
  description:
    "Открытый чемпионат Польши по интеллектуальным играм — архив сезонов с 2017/2018",
};

function OchpFallback() {
  return (
    <div id="page-ochp-fallback" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}

export default async function OchpPage() {
  if (process.env.DATABASE_URL) {
    try {
      await ensureLandingWidgets(OCHP_WIDGET_PATH);
    } catch (e) {
      if (!isPrismaMissingTable(e)) throw e;
    }
  }

  return (
    <Suspense fallback={<OchpFallback />}>
      <OchpPageClient />
    </Suspense>
  );
}
