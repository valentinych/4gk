"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  formatOchpSeasonRange,
  ochpSeasonHadNoChampionship,
  ochpSeasonOptions,
  ochpYearSuffix,
  parseOchpSeasonStart,
  OCHP_SEASON_START_MAX,
  OCHP_ARCHIVE_TILES,
  type OchpLandingTile,
} from "@/lib/ochp-seasons";

function buildCurrentSeasonTiles(): OchpLandingTile[] {
  const y = ochpYearSuffix(OCHP_SEASON_START_MAX);
  return [
    { slug: "schedule", emoji: "🗓️", title: `Расписание ОЧП'${y}` },
    { slug: "rating-page", emoji: "🌐", title: "Страница турнира на сайте рейтинга" },
    { slug: "participants", emoji: "👥", title: `Список участников ОЧП'${y}` },
    { slug: "rules", emoji: "📜", title: `Положение ОЧП'${y}` },
    { slug: "results-chgk", emoji: "❓", title: "Результаты Что? Где? Когда?" },
    { slug: "results-brain", emoji: "🧠", title: "Результаты Брэйн-Ринга" },
    { slug: "results-storm", emoji: "⚡", title: "Результаты Мозгового Штурма" },
    {
      slug: "appeals",
      emoji: "⚖️",
      title: "Апелляции на ЧГК",
      href: "https://docs.google.com/forms/u/1/d/e/1FAIpQLSeAGwAPKBgtASfzkZGMQ_KocQNnnNahXuv_azY_hZ8cyV3Lbg/viewform?usp=send_form",
    },
    {
      slug: "sync-signup",
      emoji: "🎯",
      title: "Заявка на синхрон в пятницу 20.03",
      href: "https://forms.gle/1M2ACrutmUEeWgMt8",
    },
    {
      slug: "rosters",
      emoji: "📋",
      title: `Подача составов на ОЧП'${y}`,
      href: "https://forms.gle/aqzNpBBmYTYDWcfZ7",
    },
    {
      slug: "legionnaires",
      emoji: "🔍",
      title: `Поиск легионеров на ОЧП'${y}`,
      href: "https://t.me/chgkpolska/85",
    },
    { slug: "food", emoji: "🍽️", title: "Где поесть рядом с МПИ" },
    {
      slug: "excursions",
      emoji: "🏛️",
      title: "Запись на экскурсии по Варшаве",
      href: "https://t.me/chgkpolska/89",
    },
    {
      slug: "fantasy",
      emoji: "🔮",
      title: "Фэнтези ОЧП",
      href: "https://fantasy.razumau.net/tournaments/pl-2026",
    },
  ];
}

export function OchpPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seasonParam = searchParams.get("season");
  const seasonStart = parseOchpSeasonStart(seasonParam);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [tournamentDateLabel, setTournamentDateLabel] = useState<
    string | null
  >(null);

  const setSeason = useCallback(
    (y: number) => {
      const next = new URLSearchParams(searchParams.toString());
      if (y === OCHP_SEASON_START_MAX) {
        next.delete("season");
      } else {
        next.set("season", String(y));
      }
      const q = next.toString();
      router.push(q ? `/ochp?${q}` : "/ochp", { scroll: false });
      setMenuOpen(false);
    },
    [router, searchParams],
  );

  const ySuffix = ochpYearSuffix(seasonStart);
  const isCurrentSeason = seasonStart === OCHP_SEASON_START_MAX;
  const noChampionship = ochpSeasonHadNoChampionship(seasonStart);
  const tiles: OchpLandingTile[] =
    noChampionship
      ? []
      : isCurrentSeason
        ? buildCurrentSeasonTiles()
        : (OCHP_ARCHIVE_TILES[seasonStart] ?? []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (noChampionship) {
      setTournamentDateLabel("—");
      return;
    }
    let cancelled = false;
    setTournamentDateLabel(null);
    fetch(
      `/api/ochp/tournament-dates?season=${encodeURIComponent(String(seasonStart))}`,
    )
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
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Trophy className="h-3.5 w-3.5" />
              Чемпионат
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              ОЧП&apos;{ySuffix}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Открытый чемпионат Польши по интеллектуальным играм. Крупнейший
              национальный турнир, объединяющий команды со всего мира.
            </p>
          </div>
          <Image
            src="/ochp-logo.png"
            alt={`ОЧП'${ySuffix}`}
            width={80}
            height={100}
            className="shrink-0 hidden sm:block"
          />
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="relative rounded-xl border border-border bg-white p-5" ref={menuRef}>
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
              <p className="text-xs text-muted">Сезон</p>
              <p className="text-sm font-bold">{formatOchpSeasonRange(seasonStart)}</p>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {menuOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg">
              {ochpSeasonOptions().map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSeason(y)}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface ${
                    y === seasonStart ? "font-bold text-accent bg-accent/5" : ""
                  }`}
                >
                  {formatOchpSeasonRange(y)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Trophy className="h-4 w-4 text-muted" />
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

      {!noChampionship && !isCurrentSeason && tiles.length === 0 && (
        <p className="mb-8 text-sm text-muted leading-relaxed">
          Материалы этого сезона на портале появятся по мере добавления.
        </p>
      )}

      {tiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => {
            const ext = tile.href?.startsWith("http");
            if (tile.href && !ext) {
              return (
                <Link
                  key={`${tile.slug}-${tile.href}`}
                  href={tile.href}
                  className="group flex items-start gap-3.5 rounded-xl border border-border bg-white p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
                >
                  <span className="text-2xl leading-none shrink-0 mt-0.5">{tile.emoji}</span>
                  <span className="text-sm font-semibold leading-snug group-hover:text-accent transition-colors">
                    {tile.title}
                  </span>
                </Link>
              );
            }
            if (ext) {
              return (
                <a
                  key={tile.slug}
                  href={tile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3.5 rounded-xl border border-border bg-white p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
                >
                  <span className="text-2xl leading-none shrink-0 mt-0.5">{tile.emoji}</span>
                  <span className="text-sm font-semibold leading-snug group-hover:text-accent transition-colors">
                    {tile.title}
                  </span>
                </a>
              );
            }
            return (
              <Link
                key={tile.slug}
                href={`/ochp/${tile.slug}`}
                className="group flex items-start gap-3.5 rounded-xl border border-border bg-white p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="text-2xl leading-none shrink-0 mt-0.5">{tile.emoji}</span>
                <span className="text-sm font-semibold leading-snug group-hover:text-accent transition-colors">
                  {tile.title}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className={`flex justify-center ${tiles.length > 0 ? "mt-12" : "mt-8"}`}>
        <Image
          src="/ochp-sponsors.png"
          alt={`Партнёры ОЧП'${ySuffix}`}
          width={800}
          height={60}
          className="opacity-70 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}
