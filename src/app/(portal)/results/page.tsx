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

const gameBadge: Record<string, string> = {
  "Квиз": "bg-blue-50 text-blue-700 border border-blue-100",
  "Реакция": "bg-emerald-50 text-emerald-700 border border-emerald-100",
  "Память": "bg-amber-50 text-amber-700 border border-amber-100",
};

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Результаты</h1>
        <p className="mt-1 text-sm text-muted">Последние результаты игр на портале</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Trophy, label: "Всего игр", value: "1 247" },
          { icon: TrendingUp, label: "Средний балл", value: "7 340" },
          { icon: Clock, label: "Среднее время", value: "2:15" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
                <stat.icon className="h-4 w-4 text-muted" />
              </div>
              <div>
                <p className="text-xs text-muted">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted" />
        {["Все", "Квиз", "Реакция", "Память"].map((filter, i) => (
          <button
            key={filter}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              i === 0
                ? "bg-accent text-white"
                : "border border-border text-muted hover:bg-surface"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface/50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">#</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Игрок</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Игра</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">Счёт</th>
              <th className="hidden px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted sm:table-cell">Время</th>
              <th className="hidden px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted md:table-cell">Дата</th>
            </tr>
          </thead>
          <tbody>
            {mockResults.map((r, i) => (
              <tr key={r.id} className="border-b border-border/50 transition-colors hover:bg-surface/30">
                <td className="px-5 py-4 font-mono text-sm text-muted">{i + 1}</td>
                <td className="px-5 py-4 text-sm font-semibold">{r.player}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${gameBadge[r.game]}`}>
                    {r.game}
                  </span>
                </td>
                <td className="px-5 py-4 text-right font-mono text-sm font-bold text-success">
                  {r.score.toLocaleString("pl-PL")}
                </td>
                <td className="hidden px-5 py-4 text-right font-mono text-sm text-muted sm:table-cell">{r.duration}</td>
                <td className="hidden px-5 py-4 text-right text-sm text-muted md:table-cell">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
