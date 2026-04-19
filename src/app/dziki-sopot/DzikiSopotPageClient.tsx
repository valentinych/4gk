"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Trophy } from "lucide-react";
import Link from "next/link";
import {
  DS_ALL_YEARS,
  DS_ARCHIVE_TILES,
  DS_CURRENT_TILES,
  DS_UPCOMING_YEAR,
  isArchiveYear,
  parseDsYear,
  type DsLandingTile,
  type DsYear,
  dsYearLabel,
} from "@/lib/dziki-sopot-seasons";

function buildUpcomingDateLabel(year: DsYear): string | null {
  if (year === DS_UPCOMING_YEAR) return "4–6 сентября 2026";
  return null;
}

export function DzikiSopotPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const yearParam = searchParams.get("year");
  const year: DsYear = parseDsYear(yearParam) ?? DS_UPCOMING_YEAR;
  const isUpcoming = year === DS_UPCOMING_YEAR;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dateLabel, setDateLabel] = useState<string | null>(
    buildUpcomingDateLabel(year),
  );

  const setYear = useCallback(
    (y: DsYear) => {
      const next = new URLSearchParams(searchParams.toString());
      if (y === DS_UPCOMING_YEAR) {
        next.delete("year");
      } else {
        next.set("year", String(y));
      }
      const q = next.toString();
      router.push(q ? `/dziki-sopot?${q}` : "/dziki-sopot", { scroll: false });
      setMenuOpen(false);
    },
    [router, searchParams],
  );

  // Close menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Fetch tournament dates for archive years
  useEffect(() => {
    if (isUpcoming) {
      setDateLabel(buildUpcomingDateLabel(year));
      return;
    }
    let cancelled = false;
    setDateLabel(null);
    fetch(`/api/dziki-sopot/tournament-dates?year=${year}`)
      .then((r) => r.json())
      .then((j: { dateLabel?: string | null }) => {
        if (!cancelled) setDateLabel(j.dateLabel ?? "—");
      })
      .catch(() => {
        if (!cancelled) setDateLabel("—");
      });
    return () => {
      cancelled = true;
    };
  }, [year, isUpcoming]);

  const tiles: DsLandingTile[] = isArchiveYear(year)
    ? DS_ARCHIVE_TILES[year]
    : DS_CURRENT_TILES;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Trophy className="h-3.5 w-3.5" />
          Турнир
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {dsYearLabel(year)}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Международный турнир по интеллектуальным играм в Сопоте.
        </p>
      </div>

      {/* Year picker + date */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="relative rounded-xl border border-border bg-surface p-5" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="-m-1 flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-surface/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Calendar className="h-4 w-4 text-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Год</p>
              <p className="text-sm font-bold">{year}</p>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {menuOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {DS_ALL_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface ${
                    y === year ? "bg-accent/5 font-bold text-accent" : ""
                  }`}
                >
                  {y}
                  {y === DS_UPCOMING_YEAR && (
                    <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      ближайший
                    </span>
                  )}
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
              <p className="text-sm font-bold">
                {dateLabel === null ? "…" : dateLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tiles */}
      {tiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => {
            const isExternal = tile.href?.startsWith("http");
            if (isExternal) {
              return (
                <a
                  key={tile.slug}
                  href={tile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
                >
                  <span className="mt-0.5 shrink-0 text-2xl leading-none">{tile.emoji}</span>
                  <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
                    {tile.title}
                  </span>
                </a>
              );
            }
            if (tile.href) {
              return (
                <Link
                  key={tile.slug}
                  href={tile.href}
                  className="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
                >
                  <span className="mt-0.5 shrink-0 text-2xl leading-none">{tile.emoji}</span>
                  <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
                    {tile.title}
                  </span>
                </Link>
              );
            }
            return null;
          })}
        </div>
      )}

      {tiles.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">Материалы этого сезона появятся позже</p>
        </div>
      )}
    </div>
  );
}
