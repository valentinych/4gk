import { Gamepad2, Users, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Лобби",
  description: "Выбери игру и начни соревноваться",
};

const availableGames = [
  {
    id: "quiz",
    name: "Квиз",
    description: "Викторина с вопросами из разных категорий. Отвечай быстрее соперников!",
    players: { min: 1, max: 8, online: 24 },
    avgDuration: "5 мин",
    categories: ["Наука", "История", "География", "Спорт"],
    color: "from-violet-600 to-purple-700",
  },
  {
    id: "reaction",
    name: "Реакция",
    description: "Тест на скорость реакции. Нажми как можно быстрее после сигнала!",
    players: { min: 1, max: 4, online: 12 },
    avgDuration: "2 мин",
    categories: ["Цвета", "Звуки", "Фигуры"],
    color: "from-cyan-600 to-blue-700",
  },
  {
    id: "memory",
    name: "Память",
    description: "Запоминай последовательности и воспроизводи их. Каждый раунд сложнее!",
    players: { min: 1, max: 2, online: 8 },
    avgDuration: "4 мин",
    categories: ["Числа", "Цвета", "Паттерны"],
    color: "from-amber-600 to-orange-700",
  },
];

export default function LobbyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Лобби</h1>
        <p className="mt-2 text-foreground/50">Выбери игру и создай комнату или присоединись к существующей</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {availableGames.map((game) => (
          <div
            key={game.id}
            className="group overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:border-accent/30"
          >
            <div className={`bg-gradient-to-r ${game.color} p-6`}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{game.name}</h2>
                <Gamepad2 className="h-8 w-8 text-white/40" />
              </div>
              <p className="mt-2 text-sm text-white/70">{game.description}</p>
            </div>

            <div className="p-6">
              <div className="flex gap-4 text-sm text-foreground/50">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {game.players.min}-{game.players.max} игроков
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  ~{game.avgDuration}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-success">{game.players.online} онлайн</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {game.categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-surface-light px-3 py-1 text-xs text-foreground/50"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Link
                  href={`/${game.id}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                >
                  Быстрая игра
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button className="rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-light">
                  Создать комнату
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
