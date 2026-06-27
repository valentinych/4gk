import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TURNIRUSHKI,
  findTurnirushkaBySlug,
  turnirushkaLabel,
} from "@/lib/turnirushki";
import { findTurnirushkaGame } from "@/lib/turnirushki-games";
import TurnirushkiHazaResults from "@/app/turnirushki/[slug]/TurnirushkiHazaResults";

export async function generateStaticParams() {
  const slugs: { gameSlug: string }[] = [];
  const tournaments = [
    "drovushki-exportnye-2024",
    "sugrobushki-2025",
    "vesnushki-2025",
    "drovushki-exportnye-2025",
    "sugrobushki-2026",
  ];
  const gameSlugs = [
    "prolog",
    "chernukha",
    "chernukha-1",
    "chernukha-2",
    "chernukha-3",
    "black-chgk",
    "sync-bb",
    "elimination-1",
    "elimination-2",
    "elimination-3",
  ];
  for (const t of tournaments) {
    for (const g of gameSlugs) {
      if (findTurnirushkaGame(t, g)) slugs.push({ gameSlug: g });
    }
  }
  return slugs;
}

export default async function TurnirushkiGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { gameSlug } = await params;
  const sp = await searchParams;
  const current = findTurnirushkaBySlug(sp.t);
  const game = findTurnirushkaGame(current.slug, gameSlug);
  if (!game) notFound();

  const backHref =
    sp.t && TURNIRUSHKI.some((t) => t.slug === sp.t)
      ? `/turnirushki?t=${sp.t}`
      : "/turnirushki";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Турнирушкам
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{game.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {turnirushkaLabel(current)} · {current.dateLabel}
        </p>
      </div>

      {game.type === "haza-broadcast" && game.broadcastId != null ? (
        <TurnirushkiHazaResults broadcastId={game.broadcastId} title={game.title} />
      ) : game.url ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm text-muted mb-4">
            Результаты этой игры доступны на haza.online
          </p>
          <a
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
          >
            Открыть haza.online <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
