"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Trophy, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import type { RecentGame } from "@/app/api/player/recent-games/route";

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function PositionBadge({ position, total }: { position: number | null; total: number }) {
  if (position === null) return <span className="text-xs text-muted">—</span>;

  let colorClass = "bg-gray-100 text-gray-600";
  if (position === 1) colorClass = "bg-yellow-100 text-yellow-700";
  else if (position === 2) colorClass = "bg-gray-100 text-gray-600";
  else if (position === 3) colorClass = "bg-amber-100 text-amber-700";
  else if (position <= 5) colorClass = "bg-blue-50 text-blue-600";

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
      {position}/{total}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted">
        <Minus className="h-3 w-3" />0
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
        <TrendingUp className="h-3 w-3" />+{delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-500">
      <TrendingDown className="h-3 w-3" />{delta}
    </span>
  );
}

export default function RecentGames() {
  const { data: session, status } = useSession();
  const [games, setGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(false);

  const isLoggedIn = status === "authenticated" && !!session?.user;
  const chgkId = session?.user?.chgkId;

  useEffect(() => {
    if (!chgkId) return;
    setLoading(true);
    fetch(`/api/player/recent-games?chgkId=${chgkId}`)
      .then((r) => r.json())
      .then((data) => setGames(data.games ?? []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [chgkId]);

  if (status === "loading") {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      </section>
    );
  }

  if (!isLoggedIn) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Присоединяйся
          </h2>
          <p className="mt-3 text-muted">
            Войди чтобы следить за результатами своей команды
          </p>
          <Link
            href="/auth/signin"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            Войти
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  if (!chgkId) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Привяжи рейтинг ЧГК
          </h2>
          <p className="mt-3 text-muted">
            Укажи свой ID на сайте рейтинга, чтобы видеть последние результаты
          </p>
          <Link
            href="/account"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            Перейти в профиль
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Мои последние игры</h2>
          <p className="mt-2 text-muted">Загрузка результатов…</p>
          <div className="mt-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-white p-4">
                <div className="h-4 w-2/3 rounded bg-gray-100" />
                <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!games.length) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <Trophy className="mx-auto h-10 w-10 text-muted" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Пока нет игр</h2>
          <p className="mt-3 text-muted">
            Результаты появятся после участия в турнирах ЧГК
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Мои последние игры</h2>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {games.map((game) => (
            <a
              key={game.tournamentId}
              href={`https://rating.chgk.info/tournament/${game.tournamentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-all hover:border-border-hover hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold group-hover:text-accent">
                    {game.tournamentName}
                  </p>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{formatDate(game.date)}</span>
                  <span>·</span>
                  <span>{game.teamName}</span>
                  {game.questionsTotal !== null && (
                    <>
                      <span>·</span>
                      <span>
                        {game.questionsTotal}
                        {game.questionsMax !== null && `/${game.questionsMax}`}
                        {" взято"}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <PositionBadge position={game.position} total={game.totalTeams} />
                <DeltaBadge delta={game.ratingDelta} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
