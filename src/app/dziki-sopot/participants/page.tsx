import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { fetchDsParticipantsForDisplay } from "@/lib/ds-participants-display";
import { ParticipantsTable } from "./ParticipantsTable";

export const metadata: Metadata = {
  title: "Участники | Dziki Sopot 🐗 2026",
  description: "Список команд-участников Dziki Sopot 2026",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DsParticipantsPage() {
  return (
    <div id="page-ds-participants" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dziki-sopot"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dziki Sopot
      </Link>

      <div id="page-ds-participants-header" className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Users className="h-3.5 w-3.5" />
          Dziki Sopot 🐗 — 2026
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Участники</h1>
      </div>

      <Suspense fallback={<ParticipantsSkeleton />}>
        <ParticipantsSection />
      </Suspense>

      <p className="mt-4 text-xs text-muted">
        Данные обновляются автоматически из{" "}
        <a
          href="https://docs.google.com/spreadsheets/d/1muLzibrQamNZxNk-fA7gCvrLLXqzVhJXMT_f1UCZ_nU/edit"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-accent"
        >
          Google Sheets
        </a>
        . Рейтинг —{" "}
        <a
          href="https://rating.chgk.gg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-accent"
        >
          rating.chgk.gg
        </a>
        .
      </p>
    </div>
  );
}

function ParticipantsSkeleton() {
  return (
    <div
      id="page-ds-participants-skeleton"
      aria-busy="true"
      aria-live="polite"
      className="animate-pulse"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted">
        <div className="h-4 w-24 rounded bg-muted/30" />
        <div className="h-5 w-56 rounded-full bg-muted/20" />
      </div>

      <div id="page-ds-participants-skeleton-chips" className="mb-6 flex flex-wrap gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-44 rounded-full border border-border bg-surface" />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="h-9 bg-muted/15" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-t border-border/40 px-3 py-3"
          >
            <div className="h-3 w-3 rounded-full bg-muted/25" />
            <div className="h-3 w-6 rounded bg-muted/20" />
            <div className="h-3 flex-1 rounded bg-muted/20" />
            <div className="hidden sm:block h-3 w-20 rounded bg-muted/15" />
            <div className="hidden sm:block h-3 w-10 rounded bg-muted/15" />
            <div className="hidden lg:block h-3 w-24 rounded bg-muted/15" />
            <div className="h-5 w-24 rounded-full bg-muted/20" />
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        Загружаем данные из Google Sheets и рейтинга ЧГК…
      </p>
    </div>
  );
}

async function ParticipantsSection() {
  const [data, admin] = await Promise.all([
    fetchDsParticipantsForDisplay().catch(() => ({
      participants: [],
      ratingReleaseDate: null,
      overrides: { removed: [], confirmed: [] },
    })),
    requireAdmin(),
  ]);

  return (
    <ParticipantsTable
      participants={data.participants}
      ratingReleaseDate={data.ratingReleaseDate}
      isAdmin={!!admin}
    />
  );
}
