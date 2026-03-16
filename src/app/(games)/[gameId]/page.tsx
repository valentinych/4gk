import { Gamepad2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const gameInfo: Record<string, { name: string; description: string }> = {
  quiz: {
    name: "Квиз",
    description: "Ответь на вопросы быстрее соперников!",
  },
  reaction: {
    name: "Реакция",
    description: "Проверь скорость своей реакции!",
  },
  memory: {
    name: "Память",
    description: "Запоминай и воспроизводи последовательности!",
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
        <h1 className="text-2xl font-bold">Игра не найдена</h1>
        <Link href="/lobby" className="mt-4 text-accent-light hover:underline">
          Вернуться в лобби
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/lobby"
        className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад в лобби
      </Link>

      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
          <Gamepad2 className="h-8 w-8 text-accent-light" />
        </div>
        <h1 className="mt-4 text-3xl font-bold">{game.name}</h1>
        <p className="mt-2 text-foreground/50">{game.description}</p>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-background p-12">
          <p className="text-lg text-foreground/30">
            Игровой экран будет здесь
          </p>
          <p className="mt-2 text-sm text-foreground/20">
            Подключение к Socket.io серверу для мультиплеера
          </p>
        </div>

        <button className="mt-8 rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent/90">
          Начать игру
        </button>
      </div>
    </div>
  );
}
