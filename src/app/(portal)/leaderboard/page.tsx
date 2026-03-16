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
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-300" />;
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
  return <span className="flex h-6 w-6 items-center justify-center font-mono text-sm text-foreground/40">{rank}</span>;
}

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1.5 text-sm text-yellow-400">
          <Trophy className="h-4 w-4" />
          Таблица лидеров
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Рейтинг игроков</h1>
        <p className="mt-2 text-foreground/50">Лучшие игроки портала 4gk.pl</p>
      </div>

      {/* Top 3 */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {mockLeaderboard.slice(0, 3).map((player) => (
          <div
            key={player.rank}
            className={`relative overflow-hidden rounded-2xl border p-6 text-center ${
              player.rank === 1
                ? "order-first border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent sm:order-none sm:col-start-2"
                : player.rank === 2
                ? "border-gray-400/20 bg-gradient-to-b from-gray-400/10 to-transparent sm:col-start-1"
                : "border-amber-700/20 bg-gradient-to-b from-amber-700/10 to-transparent sm:col-start-3"
            }`}
          >
            <RankBadge rank={player.rank} />
            <h3 className="mt-3 text-lg font-bold">{player.name}</h3>
            <p className="mt-1 font-mono text-2xl font-bold text-success">
              {player.score.toLocaleString()}
            </p>
            <div className="mt-3 flex justify-center gap-4 text-xs text-foreground/40">
              <span>{player.games} игр</span>
              <span>Win {player.winRate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Rest */}
      <div className="space-y-2">
        {mockLeaderboard.slice(3).map((player) => (
          <div
            key={player.rank}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent/20"
          >
            <div className="flex items-center gap-4">
              <RankBadge rank={player.rank} />
              <span className="font-semibold">{player.name}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="hidden text-foreground/40 sm:block">{player.games} игр</span>
              <span className="hidden text-foreground/40 sm:block">{player.winRate}</span>
              <span className="font-mono font-bold text-success">
                {player.score.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
