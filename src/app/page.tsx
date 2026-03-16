import Link from "next/link";
import { Gamepad2, Trophy, Zap, Users, ArrowRight, Star } from "lucide-react";

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

const games = [
  {
    slug: "quiz",
    name: "Квиз",
    description: "Проверь свои знания в увлекательной викторине",
    players: "1-8",
    color: "from-violet-500/20 to-purple-600/20",
    borderColor: "border-violet-500/30",
  },
  {
    slug: "reaction",
    name: "Реакция",
    description: "Кто быстрее? Тестируй скорость своей реакции",
    players: "1-4",
    color: "from-cyan-500/20 to-blue-600/20",
    borderColor: "border-cyan-500/30",
  },
  {
    slug: "memory",
    name: "Память",
    description: "Тренируй память и запоминай последовательности",
    players: "1-2",
    color: "from-amber-500/20 to-orange-600/20",
    borderColor: "border-amber-500/30",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(108,92,231,0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent-light">
              <Star className="h-4 w-4" />
              Новый игровой портал
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Играй.{" "}
              <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
                Соревнуйся.
              </span>{" "}
              Побеждай.
            </h1>
            <p className="mt-6 text-lg leading-8 text-foreground/60 sm:text-xl">
              Информационный портал с онлайн-играми, результатами и рейтингами.
              Присоединяйся к сообществу игроков на 4gk.pl
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
            {games.map((game) => (
              <Link
                key={game.slug}
                href={`/${game.slug}`}
                className={`group relative overflow-hidden rounded-2xl border ${game.borderColor} bg-gradient-to-br ${game.color} p-6 transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{game.name}</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                    {game.players} игроков
                  </span>
                </div>
                <p className="mt-3 text-sm text-foreground/60">{game.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-accent-light transition-colors group-hover:text-white">
                  Играть
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-surface/30 py-20">
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
