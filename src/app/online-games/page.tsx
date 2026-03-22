import { Zap, Gamepad2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Онлайн-игры",
  description: "Онлайн-инструменты для интеллектуальных игр",
};

const games = [
  {
    href: "/buzzer",
    emoji: <Zap className="h-6 w-6 text-red-500" />,
    title: "Кнопка СИ",
    description: "Система кнопок для игры в «Свою игру»",
  },
];

export default function OnlineGamesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          <Gamepad2 className="h-3.5 w-3.5" />
          Инструменты
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Онлайн-игры
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Онлайн-инструменты для проведения интеллектуальных игр.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className="group rounded-xl border border-border bg-white p-6 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3">{game.emoji}</div>
            <h2 className="text-sm font-bold group-hover:text-accent transition-colors">
              {game.title}
            </h2>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              {game.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
