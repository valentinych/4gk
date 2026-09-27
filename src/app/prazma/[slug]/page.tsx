import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ChgkRatingApiResults from "@/app/ochp/[slug]/ChgkRatingApiResults";
import { isPrismaMissingTable } from "@/lib/page-widgets";
import { PRAZMA_RATING_TOURNAMENT_ID, ensurePrazmaEvent } from "@/lib/prazma";
import { PrazmaParticipantsPage } from "./PrazmaParticipantsPage";

type Props = {
  params: Promise<{ slug: string }>;
};

const PAGE_TITLES: Record<string, string> = {
  participants: "Участники Пражмы 2026",
  results: "Результаты рейтинга — Пражма 2026",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: PAGE_TITLES[slug] ?? slug };
}

export default async function PrazmaSlugPage({ params }: Props) {
  const { slug } = await params;

  if (process.env.DATABASE_URL) {
    try {
      await ensurePrazmaEvent();
    } catch (e) {
      if (!isPrismaMissingTable(e)) throw e;
    }
  }

  const title = PAGE_TITLES[slug];

  return (
    <div id="page-prazma-slug" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/prazma"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Пражме
      </Link>
      <div id="page-prazma-slug-header" className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title ?? slug}
        </h1>
      </div>

      {slug === "participants" ? (
        <PrazmaParticipantsPage />
      ) : slug === "results" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Официальная таблица с rating.chgk.info (турнир 13490). Живое табло
            игры — на странице{" "}
            <Link href="/prague" className="text-accent hover:underline">
              /prague
            </Link>
            .
          </p>
          <ChgkRatingApiResults
            tournamentId={PRAZMA_RATING_TOURNAMENT_ID}
            showChst={false}
          />
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">Страница не найдена</p>
          <Link href="/prazma" className="mt-3 inline-block text-sm text-accent hover:underline">
            Вернуться к Пражме
          </Link>
        </div>
      )}
    </div>
  );
}
