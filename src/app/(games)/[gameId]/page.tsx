import { ArrowLeft, Brain, Zap, BarChart3, type LucideIcon } from "lucide-react";
import Link from "next/link";

const gameInfo: Record<string, { name: string; description: string; icon: LucideIcon; color: string }> = {
  quiz: {
    name: "Квиз",
    description: "Ответь на вопросы быстрее соперников!",
    icon: Brain,
    color: "bg-blue-100 text-blue-600",
  },
  reaction: {
    name: "Реакция",
    description: "Проверь скорость своей реакции!",
    icon: Zap,
    color: "bg-emerald-100 text-emerald-600",
  },
  memory: {
    name: "Память",
    description: "Запоминай и воспроизводи последовательности!",
    icon: BarChart3,
    color: "bg-amber-100 text-amber-600",
  },
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = gameInfo[gameId];

  if (!game) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <h1 className="text-xl font-bold">Игра не найдена</h1>
        <Link href="/lobby" className="mt-3 text-sm font-medium text-muted hover:text-foreground">
          Вернуться в лобби
        </Link>
      </div>
    );
  }

  const Icon = game.icon;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/lobby"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад в лобби
      </Link>

      <div className="rounded-xl border border-border bg-white p-8 text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl ${game.color}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">{game.name}</h1>
        <p className="mt-1 text-sm text-muted">{game.description}</p>

        <div className="mt-8 rounded-lg border-2 border-dashed border-border bg-surface p-14">
          <p className="text-base text-muted/50">Игровой экран</p>
          <p className="mt-1 text-xs text-muted/30">Socket.io мультиплеер</p>
        </div>

        <button className="mt-8 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
          Начать игру
        </button>
      </div>
    </div>
  );
}
