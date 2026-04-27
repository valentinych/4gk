import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Sparkles, Users } from "lucide-react";
import { SYRENY_LITE, SYRENY_LITE_SCHEDULE } from "@/lib/syreny-lite";

export const metadata: Metadata = {
  title: "Mazowieckie Syreny Lite",
  description:
    "Любительский турнир для начинающих команд: 6–7 июня 2026, Варшава. КСИ, Б-52, Брейн-Ринг, ЭК, Чёрное ЧГК, Островок Бесконечности.",
};

export default function MazowieckieSyrenyLitePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/amateur"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Любительские турниры
      </Link>

      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-lime-100 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
          <Sparkles className="h-3.5 w-3.5" />
          Любительские турниры
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          🧜‍♀️ {SYRENY_LITE.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Турнир для начинающих команд. Два дня игр в Варшаве.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <CalendarDays className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Даты</p>
              <p className="text-sm font-bold">6–7 июня 2026</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <MapPin className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Место</p>
              <a
                href="https://maps.app.goo.gl/tZb6QtAgYRP9VjwEA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-bold hover:text-accent transition-colors"
              >
                Варшава, BMH, Dożynkowa 6a
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/mazowieckie-syreny-lite/participants"
          className="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
        >
          <Users className="h-6 w-6 shrink-0 text-muted group-hover:text-accent transition-colors" />
          <span className="text-sm font-semibold leading-snug group-hover:text-accent transition-colors">
            Список команд · Заявка
          </span>
        </Link>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold tracking-tight">📌 Предварительная программа</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SYRENY_LITE_SCHEDULE.map((day) => (
            <div key={day.day} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="mb-3 text-sm font-bold">{day.day}</h3>
              <ul className="space-y-2.5">
                {day.items.map((item) => (
                  <li key={`${day.day}-${item.time}-${item.title}`} className="text-sm leading-snug">
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                        {item.time}
                      </span>
                      <div className="min-w-0">
                        {item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium hover:text-accent transition-colors"
                          >
                            {item.title}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </a>
                        ) : (
                          <span className="font-medium">{item.title}</span>
                        )}
                        {item.note && (
                          <span className="ml-1 text-xs text-muted">({item.note})</span>
                        )}
                        {item.subtitle && (
                          <div className="text-xs text-muted">{item.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-900 shadow-sm">
          <p className="mb-3">
            <span className="mr-1.5">❗️</span>
            В турнире могут принимать участие команды <strong>не выше 600-го места</strong>{" "}
            в{" "}
            <a
              href="https://rating.chgk.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950 hover:decoration-amber-700"
            >
              общем рейтинге
            </a>
            . Легионерами (или участниками сборных команд) могут быть
            игроки, которые входят в базовые составы команд не выше 600-го места.
            Игроки, не входящие в базовые составы каких-либо команд, будут
            рассматриваться отдельными запросами в оргкомитет.
          </p>
          <p className="mb-3">
            <span className="mr-1.5">👍</span>
            Мы сможем принять <strong>16 команд</strong>. При рассмотрении заявок мы
            будем идти снизу рейтинга — кто ниже, тому больше гарантии участия.
            Предварительный список участников будет оглашён <strong>10 мая</strong>.
          </p>
          <p className="mb-3">
            <span className="mr-1.5">🤝</span>
            В рейтинг пойдут 2 синхрона. В зачёт турнира — все 72 вопроса ЧГК с
            этих синхронов. Награды — за каждую игру.
          </p>
          <p>
            <strong>Стоимость участия:</strong> 70 зл/чел — студенты, 100 зл/чел —
            не студенты (касаемо оплаты свяжемся с вами отдельно). Также участникам
            будет предложено горячее питание (около 40 зл/чел).
          </p>
        </div>
      </section>
    </div>
  );
}
