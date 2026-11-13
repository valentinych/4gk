"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, ChevronDown, Trophy } from "lucide-react";
import { PageWidgetTiles } from "@/components/page-widgets/PageWidgetTiles";
import {
  OCHP_ARCHIVE_TILES,
  OCHP_GLOBAL_TILES,
  OCHP_SEASON_START_MAX,
  formatOchpChampionshipYear,
  ochpChampionshipYearList,
  ochpSeasonHadNoChampionship,
  ochpYearHref,
  ochpYearSuffix,
  type OchpLandingTile,
} from "@/lib/ochp-seasons";

type YearLink = { year: number; href: string };

export function ochpYearLinks(): YearLink[] {
  return ochpChampionshipYearList().map((year) => ({
    year,
    href: ochpYearHref(year),
  }));
}

export function OchpSeasonMenu({ selectedYear }: { selectedYear: number }) {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div
      id="page-ochp-year-picker"
      className="relative rounded-xl border border-border bg-surface p-5"
      ref={menuRef}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
        className="flex w-full items-center gap-3 rounded-lg -m-1 p-1 text-left transition-colors hover:bg-surface/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
          <Calendar className="h-4 w-4 text-muted" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Год</p>
          <p className="text-sm font-bold">{selectedYear}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {menuOpen && (
        <ul
          id={menuId}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {ochpYearLinks().map((opt) => (
            <li key={opt.year}>
              <Link
                href={opt.href}
                aria-current={opt.year === selectedYear ? "page" : undefined}
                onClick={() => {
                  if (opt.year === selectedYear) setMenuOpen(false);
                }}
                className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 ${
                  opt.year === selectedYear ? "bg-accent/5 font-bold text-accent" : ""
                }`}
              >
                {opt.year}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OchpPageClient({
  seasonStart,
  widgetPath,
}: {
  seasonStart: number;
  /** Stored widget path when it differs from the public URL (current season). */
  widgetPath?: string;
}) {
  const [tournamentDateLabel, setTournamentDateLabel] = useState<string | null>(null);

  const ySuffix = ochpYearSuffix(seasonStart);
  const isCurrentSeason = seasonStart === OCHP_SEASON_START_MAX;
  const noChampionship = ochpSeasonHadNoChampionship(seasonStart);
  const useWidgets = isCurrentSeason && !noChampionship;
  const seasonTiles: OchpLandingTile[] =
    noChampionship || isCurrentSeason ? [] : (OCHP_ARCHIVE_TILES[seasonStart] ?? []);
  const tiles = useWidgets ? [] : [...seasonTiles, ...OCHP_GLOBAL_TILES];

  useEffect(() => {
    if (noChampionship) {
      setTournamentDateLabel("—");
      return;
    }
    let cancelled = false;
    setTournamentDateLabel(null);
    fetch(`/api/ochp/tournament-dates?season=${encodeURIComponent(String(seasonStart))}`)
      .then((r) => r.json())
      .then((j: { dateLabel?: string | null }) => {
        if (!cancelled) setTournamentDateLabel(j.dateLabel ?? "—");
      })
      .catch(() => {
        if (!cancelled) setTournamentDateLabel("—");
      });
    return () => {
      cancelled = true;
    };
  }, [seasonStart, noChampionship]);

  return (
    <div id="page-ochp" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div id="page-ochp-header" className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Чемпионат
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ОЧП&apos;{ySuffix}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Открытый чемпионат Польши по интеллектуальным играм. Крупнейший национальный турнир,
              объединяющий команды со всего мира.
            </p>
          </div>
          <Image
            src="/ochp-logo.png"
            alt={`ОЧП'${ySuffix}`}
            width={80}
            height={100}
            className="hidden shrink-0 sm:block"
          />
        </div>
      </div>

      <div id="page-ochp-controls" className="mb-8 grid gap-4 sm:grid-cols-2">
        <OchpSeasonMenu selectedYear={Number(formatOchpChampionshipYear(seasonStart))} />
        <div id="page-ochp-date-card" className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Trophy className="h-4 w-4 text-muted" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted">Дата</p>
              <p className="text-sm font-bold">
                {tournamentDateLabel === null ? "…" : tournamentDateLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {noChampionship && (
        <p className="mb-8 rounded-xl border border-border bg-surface/80 px-5 py-4 text-center text-sm font-medium text-foreground">
          Чемпионат Польши в этот сезон не проводился
        </p>
      )}

      {!noChampionship && !isCurrentSeason && seasonTiles.length === 0 && (
        <p className="mb-8 text-sm leading-relaxed text-muted">
          Материалы этого сезона на портале появятся по мере добавления.
        </p>
      )}

      {useWidgets ? <PageWidgetTiles embedded path={widgetPath} /> : null}

      {tiles.length > 0 && (
        <div id="page-ochp-tiles" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => {
            const ext = tile.href?.startsWith("http");
            const className =
              "group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5";
            const inner = (
              <>
                <span className="mt-0.5 shrink-0 text-2xl leading-none">{tile.emoji}</span>
                <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
                  {tile.title}
                </span>
              </>
            );
            if (tile.href && !ext) {
              return (
                <Link key={`${tile.slug}-${tile.href}`} href={tile.href} className={className}>
                  {inner}
                </Link>
              );
            }
            if (ext && tile.href) {
              return (
                <a
                  key={tile.slug}
                  href={tile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link key={tile.slug} href={`/ochp/${tile.slug}`} className={className}>
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      <div className={`flex justify-center ${useWidgets || tiles.length > 0 ? "mt-12" : "mt-8"}`}>
        <Image
          src="/ochp-sponsors.png"
          alt={`Партнёры ОЧП'${ySuffix}`}
          width={800}
          height={60}
          className="opacity-70 transition-opacity hover:opacity-100"
        />
      </div>
    </div>
  );
}
