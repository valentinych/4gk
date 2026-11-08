import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ChgkRatingApiResults from "@/app/ochp/[slug]/ChgkRatingApiResults";
import { OCHB_LINKS, OCHB_RATING_TOURNAMENT_ID } from "@/lib/ochb";
import { OchbParticipantsPage } from "./OchbParticipantsPage";
import { OchbSchedulePage } from "./OchbSchedulePage";

type Props = {
  params: Promise<{ slug: string }>;
};

const PAGE_TITLES: Record<string, string> = {
  participants: "Участники ОЧБ-2026",
  schedule: "Расписание ОЧБ-2026",
  links: "Полезные ссылки — ОЧБ-2026",
  results: "Результаты рейтинга — ОЧБ-2026",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: PAGE_TITLES[slug] ?? slug };
}

export default async function OchbSlugPage({ params }: Props) {
  const { slug } = await params;
  const title = PAGE_TITLES[slug];

  return (
    <div id="page-ochb-slug" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/ochb"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к ОЧБ
      </Link>
      <div id="page-ochb-slug-header" className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title ?? slug}
        </h1>
      </div>

      {slug === "participants" ? (
        <OchbParticipantsPage />
      ) : slug === "schedule" ? (
        <OchbSchedulePage />
      ) : slug === "links" ? (
        <div id="page-ochb-links" className="space-y-3">
          {OCHB_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
            >
              <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
                {link.label}
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted" />
            </a>
          ))}
        </div>
      ) : slug === "results" ? (
        <div id="page-ochb-results" className="space-y-4">
          <p className="text-sm text-muted">
            Официальная таблица турнира {OCHB_RATING_TOURNAMENT_ID} на rating.chgk.info.
          </p>
          <ChgkRatingApiResults
            tournamentId={OCHB_RATING_TOURNAMENT_ID}
            showChst={false}
          />
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">Страница не найдена</p>
          <Link href="/ochb" className="mt-3 inline-block text-sm text-accent hover:underline">
            Вернуться к ОЧБ
          </Link>
        </div>
      )}
    </div>
  );
}
