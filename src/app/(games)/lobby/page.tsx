import { Users, Clock, ArrowRight, Brain, Zap, BarChart3 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Лобби",
  description: "Выбери игру и начни соревноваться",
};

const availableGames = [
  {
    id: "quiz",
    icon: Brain,
    name: "Квиз",
    description: "Викторина с вопросами из разных категорий. Отвечай быстрее соперников!",
    players: { min: 1, max: 8, online: 24 },
    avgDuration: "5 мин",
    categories: ["Наука", "История", "География", "Спорт"],
    headerColor: "from-blue-500 to-blue-600",
    badgeColor: "bg-blue-50 text-blue-700 border border-blue-100",
  },
  {
    id: "reaction",
    icon: Zap,
    name: "Реакция",
    description: "Тест на скорость реакции. Нажми как можно быстрее после сигнала!",
    players: { min: 1, max: 4, online: 12 },
    avgDuration: "2 мин",
    categories: ["Цвета", "Звуки", "Фигуры"],
    headerColor: "from-emerald-500 to-emerald-600",
    badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  },
  {
    id: "memory",
    icon: BarChart3,
    name: "Память",
    description: "Запоминай последовательности и воспроизводи их. Каждый раунд сложнее!",
    players: { min: 1, max: 2, online: 8 },
    avgDuration: "4 мин",
    categories: ["Числа", "Цвета", "Паттерны"],
    headerColor: "from-amber-500 to-amber-600",
    badgeColor: "bg-amber-50 text-amber-700 border border-amber-100",
  },
];

export default function LobbyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Лобби</h1>
        <p className="mt-1 text-sm text-muted">Выбери игру и создай комнату или присоединись к существующей</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {availableGames.map((game) => (
          <div
            key={game.id}
            className="overflow-hidden rounded-xl border border-border bg-white"
          >
            <div className={`bg-gradient-to-r ${game.headerColor} p-5`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{game.name}</h2>
                <game.icon className="h-6 w-6 text-white/50" />
              </div>
              <p className="mt-1.5 text-sm text-white/80">{game.description}</p>
            </div>

            <div className="p-5">
              <div className="flex gap-4 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {game.players.min}-{game.players.max} игроков
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  ~{game.avgDuration}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-success">{game.players.online} онлайн</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {game.categories.map((cat) => (
                  <span key={cat} className={`rounded-md px-2 py-0.5 text-xs font-medium ${game.badgeColor}`}>
                    {cat}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex gap-2">
                <Link
                  href={`/${game.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Быстрая игра
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface">
                  Комната
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
