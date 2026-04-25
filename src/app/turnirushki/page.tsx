import { Suspense } from "react";
import type { Metadata } from "next";
import { TurnirushkiPageClient } from "./TurnirushkiPageClient";

export const metadata: Metadata = {
  title: "Турнирушки",
  description: "Турнирушки — серия турниров Вроцлавского Клуба по интеллектуальным играм в Польше",
};

function TurnirushkiFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}

export default function TurnirushkiPage() {
  return (
    <Suspense fallback={<TurnirushkiFallback />}>
      <TurnirushkiPageClient />
    </Suspense>
  );
}
