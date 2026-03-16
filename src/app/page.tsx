import Link from "next/link";
import { Gamepad2, Trophy, Zap, Users, ArrowRight, BarChart3, Clock, Brain } from "lucide-react";

const features = [
  {
    icon: Gamepad2,
    title: "Онлайн-игры",
    description: "Играй в реальном времени с игроками со всего мира",
  },
  {
    icon: Trophy,
    title: "Рейтинги",
    description: "Следи за прогрессом и сравнивай результаты",
  },
  {
    icon: Zap,
    title: "Мгновенный старт",
    description: "Без скачивания — просто открой браузер",
  },
  {
    icon: Users,
    title: "Мультиплеер",
    description: "Соревнуйся с друзьями или соперниками",
  },
];

const games = [
  {
    slug: "quiz",
    icon: Brain,
    name: "Квиз",
    description: "Проверь свои знания в увлекательной викторине с вопросами из разных категорий",
    players: "1-8 игроков",
    duration: "~5 мин",
    accent: "bg-blue-50 text-blue-700 border-blue-100",
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    slug: "reaction",
    icon: Zap,
    name: "Реакция",
    description: "Кто быстрее? Тестируй скорость своей реакции и соревнуйся за лучшее время",
    players: "1-4 игроков",
    duration: "~2 мин",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    slug: "memory",
    icon: BarChart3,
    name: "Память",
    description: "Тренируй память и запоминай последовательности. Каждый раунд сложнее!",
    players: "1-2 игроков",
    duration: "~4 мин",
    accent: "bg-amber-50 text-amber-700 border-amber-100",
    iconBg: "bg-amber-100 text-amber-600",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-sm font-medium tracking-widest uppercase text-muted">
              Игровой портал
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Играй. Соревнуйся. Побеждай.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              Информационный портал с онлайн-играми, результатами и рейтингами.
              Присоединяйся к сообществу игроков.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/lobby"
                className="flex items-center gap-2 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                <Gamepad2 className="h-4 w-4" />
                Начать игру
              </Link>
              <Link
                href="/results"
                className="flex items-center gap-2 rounded-xl border border-border px-7 py-3 text-sm font-semibold transition-colors hover:bg-surface"
              >
                Смотреть результаты
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border bg-surface/50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="animate-fade-up rounded-xl border border-border bg-white p-5"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <f.icon className="h-5 w-5 text-muted" />
                <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Доступные игры</h2>
            <p className="mt-2 text-muted">Выбери игру и начни соревноваться</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <Link
                key={game.slug}
                href={`/${game.slug}`}
                className="group rounded-xl border border-border bg-white p-6 transition-all hover:border-border-hover hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${game.iconBg}`}>
                    <game.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{game.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{game.description}</p>
                <div className="mt-4 flex gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${game.accent}`}>
                    <Users className="mr-1 inline h-3 w-3" />{game.players}
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${game.accent}`}>
                    <Clock className="mr-1 inline h-3 w-3" />{game.duration}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-surface/50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 text-center sm:grid-cols-4">
            {[
              { value: "3", label: "Игры" },
              { value: "1 200+", label: "Сыграно партий" },
              { value: "500+", label: "Вопросов" },
              { value: "24/7", label: "Онлайн" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold tracking-tight">{s.value}</p>
                <p className="mt-1 text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Готов к соревнованиям?
          </h2>
          <p className="mt-3 text-muted">
            Зарегистрируйся бесплатно и начни набирать очки
          </p>
          <Link
            href="/auth/signin"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            Создать аккаунт
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
