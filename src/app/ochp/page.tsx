import { Calendar, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ОЧП'26",
  description: "Открытый чемпионат Польши по интеллектуальным играм — сезон 2026",
};

const tiles: { slug: string; emoji: string; title: string; href?: string }[] = [
  { slug: "schedule",     emoji: "🗓️", title: "Расписание ОЧП'26" },
  { slug: "rating-page",  emoji: "🌐", title: "Страница турнира на сайте рейтинга" },
  { slug: "participants", emoji: "👥", title: "Список участников ОЧП'26" },
  { slug: "rules",        emoji: "📜", title: "Положение ОЧП'26" },
  { slug: "results-chgk", emoji: "❓", title: "Результаты Что? Где? Когда?" },
  { slug: "results-brain", emoji: "🧠", title: "Результаты Брэйн-Ринга" },
  { slug: "results-storm", emoji: "⚡", title: "Результаты Мозгового Штурма" },
  { slug: "appeals",      emoji: "⚖️", title: "Апелляции на ЧГК", href: "https://docs.google.com/forms/u/1/d/e/1FAIpQLSeAGwAPKBgtASfzkZGMQ_KocQNnnNahXuv_azY_hZ8cyV3Lbg/viewform?usp=send_form" },
  { slug: "sync-signup",  emoji: "🎯", title: "Заявка на синхрон в пятницу 20.03", href: "https://forms.gle/1M2ACrutmUEeWgMt8" },
  { slug: "rosters",      emoji: "📋", title: "Подача составов на ОЧП'26", href: "https://forms.gle/aqzNpBBmYTYDWcfZ7" },
  { slug: "legionnaires", emoji: "🔍", title: "Поиск легионеров на ОЧП'26", href: "https://t.me/chgkpolska/85" },
  { slug: "food",         emoji: "🍽️", title: "Где поесть рядом с МПИ" },
  { slug: "excursions",   emoji: "🏛️", title: "Запись на экскурсии по Варшаве", href: "https://t.me/chgkpolska/89" },
  { slug: "fantasy",      emoji: "🔮", title: "Фэнтези ОЧП", href: "https://fantasy.razumau.net/tournaments/pl-2026" },
];

export default function OchpPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Trophy className="h-3.5 w-3.5" />
              Чемпионат
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ОЧП&apos;26</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Открытый чемпионат Польши по интеллектуальным играм.
              Крупнейший национальный турнир, объединяющий команды со всего мира.
            </p>
          </div>
          <Image
            src="/ochp-logo.png"
            alt="ОЧП'26"
            width={80}
            height={100}
            className="shrink-0 hidden sm:block"
          />
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Calendar className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Сезон</p>
              <p className="text-sm font-bold">2026</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Trophy className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Дата</p>
              <p className="text-sm font-bold">21–22 марта 2026</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) =>
          tile.href ? (
            <a
              key={tile.slug}
              href={tile.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3.5 rounded-xl border border-border bg-white p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-2xl leading-none shrink-0 mt-0.5">{tile.emoji}</span>
              <span className="text-sm font-semibold leading-snug group-hover:text-accent transition-colors">
                {tile.title}
              </span>
            </a>
          ) : (
            <Link
              key={tile.slug}
              href={`/ochp/${tile.slug}`}
              className="group flex items-start gap-3.5 rounded-xl border border-border bg-white p-5 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-2xl leading-none shrink-0 mt-0.5">{tile.emoji}</span>
              <span className="text-sm font-semibold leading-snug group-hover:text-accent transition-colors">
                {tile.title}
              </span>
            </Link>
          ),
        )}
      </div>

      <div className="mt-12 flex justify-center">
        <Image
          src="/ochp-sponsors.png"
          alt="Партнёры ОЧП'26"
          width={800}
          height={60}
          className="opacity-70 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}
