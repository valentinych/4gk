import Link from "next/link";
import { ArrowRight, MapPin, Globe, Trophy, Calendar } from "lucide-react";
import RecentGames from "@/components/RecentGames";

const leagues = [
  {
    href: "/ochp",
    title: "ОЧП",
    description: "Открытый чемпионат Польши — крупнейший национальный турнир по интеллектуальным играм",
    badge: "Польша",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: Globe,
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    href: "/warsaw",
    title: "Чемпионат Варшавы",
    description: "Регулярный чемпионат по интеллектуальным играм среди команд Варшавы",
    badge: "Варшава",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
    icon: MapPin,
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    href: "/dziki-sopot",
    title: "Dziki Sopot",
    description: "Международный турнир по интеллектуальным играм. 05–06 сентября 2026 года",
    badge: "Сопот",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
    icon: Trophy,
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
              Интеллектуальные игры в Польше
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Результаты. Рейтинги. Турниры.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              Портал с результатами интеллектуальных игр — чемпионаты, лиги и турниры
              «Что? Где? Когда?» в Польше.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/ochp"
                className="flex items-center gap-2 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                Открытый Чемпионат Польши
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/games"
                className="flex items-center gap-2 rounded-xl border border-border px-7 py-3 text-sm font-semibold transition-colors hover:bg-surface"
              >
                Все турниры
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Leagues */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Лиги и чемпионаты</h2>
            <p className="mt-2 text-muted">Актуальные соревнования сезона 2025/2026</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <Link
                key={league.href}
                href={league.href}
                className="group rounded-xl border border-border bg-white p-6 transition-all hover:border-border-hover hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${league.iconBg}`}>
                    <league.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{league.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{league.description}</p>
                <div className="mt-4">
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${league.badgeColor}`}>
                    {league.badge}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="border-y border-border bg-surface/50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {[
              { icon: Trophy, label: "Турниры", description: "Регулярные соревнования в нескольких городах Польши" },
              { icon: Calendar, label: "Сезон 2025/2026", description: "Актуальные результаты и турнирные таблицы" },
              { icon: Globe, label: "Сообщество", description: "Объединяем команды интеллектуальных игр" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-border">
                  <item.icon className="h-5 w-5 text-muted" />
                </div>
                <p className="mt-3 text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Recent Games */}
      <RecentGames />
    </div>
  );
}
