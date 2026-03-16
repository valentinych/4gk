"use client";

import Link from "next/link";
import { Gamepad2, Trophy, Zap, Users, ArrowRight, Star } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { HeroIllustration } from "@/components/HeroIllustration";
import { GameCardIllustration } from "@/components/GameCardIllustration";
import { Logo } from "@/components/Logo";

const features = [
  {
    icon: Gamepad2,
    title: "Онлайн-игры",
    description: "Играй в реальном времени с игроками со всего мира",
  },
  {
    icon: Trophy,
    title: "Рейтинги и результаты",
    description: "Следи за своим прогрессом и сравнивай результаты",
  },
  {
    icon: Zap,
    title: "Мгновенный старт",
    description: "Без скачивания — просто открой браузер и играй",
  },
  {
    icon: Users,
    title: "Мультиплеер",
    description: "Соревнуйся с друзьями или случайными соперниками",
  },
];

const games: {
  slug: string;
  name: string;
  type: "quiz" | "reaction" | "memory";
  description: string;
  players: string;
}[] = [
  {
    slug: "quiz",
    name: "Квиз",
    type: "quiz",
    description: "Проверь свои знания в увлекательной викторине",
    players: "1-8",
  },
  {
    slug: "reaction",
    name: "Реакция",
    type: "reaction",
    description: "Кто быстрее? Тестируй скорость своей реакции",
    players: "1-4",
  },
  {
    slug: "memory",
    name: "Память",
    type: "memory",
    description: "Тренируй память и запоминай последовательности",
    players: "1-2",
  },
];

export default function HomePage() {
  const { theme } = useTheme();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: theme.heroGradient }} />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent-light">
                <Star className="h-4 w-4" />
                Новый игровой портал
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Играй.{" "}
                <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
                  Соревнуйся.
                </span>{" "}
                Побеждай.
              </h1>
              <p className="mt-6 text-lg leading-8 text-foreground/60">
                Информационный портал с онлайн-играми, результатами и рейтингами.
                Присоединяйся к сообществу игроков на 4gk.pl
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href="/lobby"
                  className="animate-pulse-glow flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-accent/90"
                >
                  <Gamepad2 className="h-5 w-5" />
                  Начать игру
                </Link>
                <Link
                  href="/results"
                  className="flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-base font-semibold transition-colors hover:bg-surface-light"
                >
                  Смотреть результаты
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* Theme Showcase */}
      <section className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 text-center">
            <Logo variant={theme.logoVariant} size="lg" />
            <div className="text-left">
              <p className="text-2xl font-bold">{theme.name}</p>
              <p className="text-sm text-foreground/50">{theme.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-surface/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="animate-fade-in rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/30"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <feature.icon className="h-5 w-5 text-accent-light" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-foreground/50">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Доступные игры</h2>
            <p className="mt-3 text-foreground/50">Выбери игру и начни соревноваться</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => {
              const colors = theme.gameColors[game.type];
              return (
                <Link
                  key={game.slug}
                  href={`/${game.slug}`}
                  className={`group relative overflow-hidden rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.gradient} p-6 transition-all hover:scale-[1.02] hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{game.name}</h3>
                      <span className="mt-1 inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium">
                        {game.players} игроков
                      </span>
                    </div>
                    <GameCardIllustration type={game.type} />
                  </div>
                  <p className="mt-3 text-sm text-foreground/60">{game.description}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-accent-light transition-colors group-hover:text-foreground">
                    Играть
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border bg-surface/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 text-center sm:grid-cols-4">
            {[
              { value: "3", label: "Игры" },
              { value: "1,200+", label: "Сыграно партий" },
              { value: "500+", label: "Вопросов" },
              { value: "24/7", label: "Онлайн" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-accent-light">{stat.value}</p>
                <p className="mt-1 text-sm text-foreground/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Готов к соревнованиям?
          </h2>
          <p className="mt-4 text-lg text-foreground/50">
            Зарегистрируйся бесплатно и начни набирать очки уже сегодня
          </p>
          <Link
            href="/auth/signin"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-accent/90"
          >
            Создать аккаунт
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
