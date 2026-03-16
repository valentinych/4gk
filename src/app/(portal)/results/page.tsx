import { Trophy, Clock, TrendingUp, Filter } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Результаты",
  description: "Последние результаты игр на 4gk.pl",
};

const mockResults = [
  { id: 1, player: "PlayerOne", game: "Квиз", score: 9500, duration: "2:34", date: "16.03.2026" },
  { id: 2, player: "GamerPro", game: "Реакция", score: 8200, duration: "1:12", date: "16.03.2026" },
  { id: 3, player: "QuizMaster", game: "Квиз", score: 7800, duration: "3:01", date: "15.03.2026" },
  { id: 4, player: "SpeedKing", game: "Реакция", score: 7500, duration: "0:58", date: "15.03.2026" },
  { id: 5, player: "MemoryAce", game: "Память", score: 7200, duration: "4:15", date: "15.03.2026" },
  { id: 6, player: "BrainStorm", game: "Квиз", score: 6900, duration: "2:50", date: "14.03.2026" },
  { id: 7, player: "FastFingers", game: "Реакция", score: 6700, duration: "1:30", date: "14.03.2026" },
  { id: 8, player: "ThinkTank", game: "Память", score: 6500, duration: "3:45", date: "14.03.2026" },
];

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Результаты</h1>
        <p className="mt-2 text-foreground/50">Последние результаты игр на портале</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Trophy, label: "Всего игр", value: "1,247" },
          { icon: TrendingUp, label: "Средний балл", value: "7,340" },
          { icon: Clock, label: "Среднее время", value: "2:15" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <stat.icon className="h-5 w-5 text-accent-light" />
              </div>
              <div>
                <p className="text-sm text-foreground/50">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <Filter className="h-4 w-4 text-foreground/40" />
        {["Все", "Квиз", "Реакция", "Память"].map((filter, i) => (
          <button
            key={filter}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              i === 0
                ? "bg-accent text-white"
                : "bg-surface text-foreground/60 hover:bg-surface-light"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">#</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Игрок</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Игра</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground/60">Счёт</th>
              <th className="hidden px-6 py-4 text-right text-sm font-semibold text-foreground/60 sm:table-cell">Время</th>
              <th className="hidden px-6 py-4 text-right text-sm font-semibold text-foreground/60 md:table-cell">Дата</th>
            </tr>
          </thead>
          <tbody>
            {mockResults.map((result, i) => (
              <tr
                key={result.id}
                className="border-b border-border/50 transition-colors hover:bg-surface/50"
              >
                <td className="px-6 py-4 text-sm font-mono text-foreground/40">{i + 1}</td>
                <td className="px-6 py-4 text-sm font-semibold">{result.player}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-light">
                    {result.game}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm font-bold text-success">
                  {result.score.toLocaleString()}
                </td>
                <td className="hidden px-6 py-4 text-right font-mono text-sm text-foreground/50 sm:table-cell">
                  {result.duration}
                </td>
                <td className="hidden px-6 py-4 text-right text-sm text-foreground/50 md:table-cell">
                  {result.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
