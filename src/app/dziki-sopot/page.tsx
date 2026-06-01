import { Suspense } from "react";
import type { Metadata } from "next";
import { DzikiSopotPageClient } from "./DzikiSopotPageClient";

export const metadata: Metadata = {
  title: "Dziki Sopot",
  description: "Международный турнир по интеллектуальным играм в Сопоте — архив сезонов",
};

function Fallback() {
  return (
    <div id="page-dziki-sopot-fallback" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}

export default function DzikiSopotPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <DzikiSopotPageClient />
    </Suspense>
  );
}
