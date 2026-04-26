import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, Trophy, Globe, Calendar } from "lucide-react";
import RecentGames from "@/components/RecentGames";

const leagues = [
  {
    href: "/ochp",
    title: "ОЧП",
    description: "Открытый чемпионат Польши",
    cities: ["Варшава"],
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    emoji: "🇵🇱",
  },
  {
    href: "/warsaw",
    title: "Чемпионат Варшавы",
    description: "Регулярный чемпионат команд Варшавы",
    cities: ["Варшава"],
    badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
    emoji: "🧜‍♀️",
  },
  {
    href: "/dziki-sopot",
    title: "Dziki Sopot",
    description: "Международный турнир",
    cities: ["Сопот"],
    badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
    emoji: "🐗",
  },
  {
    href: "/turnirushki",
    title: "Турнирушки",
    description: "Турниры Вроцлавского Клуба",
    cities: ["Вроцлав", "Познань", "Свебодзин"],
    badgeColor: "bg-orange-50 text-orange-700 border-orange-100",
    emoji: "🦉",
  },
  {
    href: "/calendar",
    title: "Любительские",
    description: "Турниры для начинающих команд",
    cities: ["Познань", "Варшава"],
    badgeColor: "bg-lime-50 text-lime-700 border-lime-100",
    emoji: "🌿",
  },
  {
    href: "/mazowieckie-syreny-lite",
    title: "Mazowieckie Syreny Lite",
    description: "Любительский турнир, 6–7 июня 2026",
    cities: ["Варшава"],
    badgeColor: "bg-lime-50 text-lime-700 border-lime-100",
    emoji: "🧜‍♀️",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-medium tracking-widest uppercase text-muted">
              Интеллектуальные игры в Польше
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Результаты. Рейтинги. Турниры.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Портал с результатами интеллектуальных игр — чемпионаты, лиги и турниры{" "}
              <br />«Что? Где? Когда?» в Польше.
            </p>
          </div>
        </div>
      </section>

      {/* Leagues */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Лиги и чемпионаты</h2>
            <p className="mt-2 text-muted">Актуальные соревнования сезона 2025/2026</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {leagues.map((league, i) => (
              <Fragment key={league.title}>
                <Link
                  href={league.href}
                  className="group basis-[calc(50%-0.375rem)] rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-hover hover:shadow-md sm:basis-[calc(33.333%-0.5rem)] lg:basis-[200px] lg:max-w-[220px]"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl leading-none" aria-hidden>
                      {league.emoji}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold">{league.title}</h3>
                  <p className="mt-1 text-xs leading-snug text-muted">{league.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {league.cities.map((city) => (
                      <span
                        key={city}
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${league.badgeColor}`}
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                </Link>
                {i === 2 && (
                  <div aria-hidden className="hidden h-0 basis-full lg:block" />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="border-y border-border bg-surface/50 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {[
              { icon: Trophy, label: "Турниры", description: "Регулярные соревнования в нескольких городах Польши" },
              { icon: Calendar, label: "Сезон 2025/2026", description: "Актуальные результаты и турнирные таблицы" },
              { icon: Globe, label: "Сообщество", description: "Объединяем команды интеллектуальных игр" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-border">
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
