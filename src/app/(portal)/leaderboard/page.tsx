import { Trophy, Medal, Crown } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Рейтинг",
  description: "Таблица лидеров на 4gk.pl",
};

const mockLeaderboard = [
  { rank: 1, name: "PlayerOne", score: 45200, games: 82, winRate: "78%" },
  { rank: 2, name: "QuizMaster", score: 41800, games: 75, winRate: "72%" },
  { rank: 3, name: "GamerPro", score: 38500, games: 68, winRate: "69%" },
  { rank: 4, name: "SpeedKing", score: 35100, games: 61, winRate: "65%" },
  { rank: 5, name: "BrainStorm", score: 32400, games: 55, winRate: "62%" },
  { rank: 6, name: "MemoryAce", score: 29900, games: 50, winRate: "58%" },
  { rank: 7, name: "FastFingers", score: 27300, games: 47, winRate: "55%" },
  { rank: 8, name: "ThinkTank", score: 24800, games: 43, winRate: "52%" },
  { rank: 9, name: "QuickMind", score: 22500, games: 40, winRate: "50%" },
  { rank: 10, name: "GameHero", score: 20100, games: 38, winRate: "47%" },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="flex h-5 w-5 items-center justify-center font-mono text-sm text-muted">{rank}</span>;
}

const podiumStyle: Record<number, string> = {
  1: "border-amber-200 bg-amber-50 sm:order-none sm:col-start-2",
  2: "border-gray-200 bg-gray-50 sm:col-start-1",
  3: "border-orange-200 bg-orange-50/50 sm:col-start-3",
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Trophy className="h-3.5 w-3.5" />
          Таблица лидеров
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Рейтинг игроков</h1>
        <p className="mt-1 text-sm text-muted">Лучшие игроки портала 4gk.pl</p>
      </div>

      {/* Top 3 */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {mockLeaderboard.slice(0, 3).map((p) => (
          <div
            key={p.rank}
            className={`relative rounded-xl border p-5 text-center ${podiumStyle[p.rank]} ${p.rank === 1 ? "order-first" : ""}`}
          >
            <RankBadge rank={p.rank} />
            <h3 className="mt-2 text-base font-bold">{p.name}</h3>
            <p className="mt-0.5 font-mono text-xl font-extrabold text-success">
              {p.score.toLocaleString("pl-PL")}
            </p>
            <div className="mt-2 flex justify-center gap-3 text-xs text-muted">
              <span>{p.games} игр</span>
              <span>{p.winRate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Rest */}
      <div className="space-y-2">
        {mockLeaderboard.slice(3).map((p) => (
          <div
            key={p.rank}
            className="flex items-center justify-between rounded-xl border border-border bg-white px-5 py-3.5 transition-colors hover:bg-surface/50"
          >
            <div className="flex items-center gap-3">
              <RankBadge rank={p.rank} />
              <span className="text-sm font-semibold">{p.name}</span>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <span className="hidden text-muted sm:block">{p.games} игр</span>
              <span className="hidden text-muted sm:block">{p.winRate}</span>
              <span className="font-mono font-bold text-success">
                {p.score.toLocaleString("pl-PL")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
