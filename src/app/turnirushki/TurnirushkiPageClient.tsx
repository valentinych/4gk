"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Trophy } from "lucide-react";
import {
  TURNIRUSHKI,
  findTurnirushkaBySlug,
  turnirushkaLabel,
} from "@/lib/turnirushki";

export function TurnirushkiPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = findTurnirushkaBySlug(searchParams.get("t"));

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const setTournament = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (slug === TURNIRUSHKI[0].slug) {
        next.delete("t");
      } else {
        next.set("t", slug);
      }
      const q = next.toString();
      router.push(q ? `/turnirushki?${q}` : "/turnirushki", { scroll: false });
      setMenuOpen(false);
    },
    [router, searchParams],
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const tParam =
    current.slug === TURNIRUSHKI[0].slug ? "" : `?t=${current.slug}`;
  const tiles: { emoji: string; title: string; href: string }[] = [
    {
      emoji: "🌐",
      title: "Страница турнира на сайте рейтинга",
      href: `/turnirushki/rating-page${tParam}`,
    },
    {
      emoji: "❓",
      title: "Результаты Что? Где? Когда?",
      href: `/turnirushki/results-chgk${tParam}`,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <Trophy className="h-3.5 w-3.5" />
              Турнирушки
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              🦉 {turnirushkaLabel(current)}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Турниры Вроцлавского Клуба
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="relative rounded-xl border border-border bg-surface p-5" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="flex w-full items-center gap-3 text-left rounded-lg -m-1 p-1 transition-colors hover:bg-surface/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Calendar className="h-4 w-4 text-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Турнир</p>
              <p className="text-sm font-bold truncate">{turnirushkaLabel(current)}</p>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {menuOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {TURNIRUSHKI.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setTournament(t.slug)}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface ${
                    t.slug === current.slug ? "font-bold text-accent bg-accent/5" : ""
                  }`}
                >
                  {turnirushkaLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Trophy className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Дата</p>
              <p className="text-sm font-bold">{current.dateLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            className="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
          >
            <span className="text-2xl leading-none shrink-0 mt-0.5">{tile.emoji}</span>
            <span className="text-sm font-semibold leading-snug group-hover:text-accent transition-colors">
              {tile.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
