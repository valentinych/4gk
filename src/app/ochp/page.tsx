import { Suspense } from "react";
import type { Metadata } from "next";
import { OchpPageClient } from "./OchpPageClient";

export const metadata: Metadata = {
  title: "ОЧП",
  description:
    "Открытый чемпионат Польши по интеллектуальным играм — архив сезонов с 2017/2018",
};

function OchpFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}

export default function OchpPage() {
  return (
    <Suspense fallback={<OchpFallback />}>
      <OchpPageClient />
    </Suspense>
  );
}
