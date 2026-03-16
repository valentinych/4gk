import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Новости",
  description: "Последние новости портала 4gk.pl",
};

const mockNews = [
  {
    slug: "launch",
    title: "Запуск портала 4gk.pl",
    excerpt: "Мы рады объявить о запуске нашего нового портала онлайн-игр! Присоединяйтесь к нам и начните соревноваться уже сегодня.",
    date: "16.03.2026",
    category: "Анонс",
  },
  {
    slug: "quiz-update",
    title: "Обновление игры «Квиз»",
    excerpt: "Добавлены новые категории вопросов: наука, история, география. Более 500 новых вопросов ждут вас!",
    date: "15.03.2026",
    category: "Обновление",
  },
  {
    slug: "tournament",
    title: "Первый турнир по «Реакции»",
    excerpt: "Регистрация на первый официальный турнир по игре «Реакция» открыта. Призовой фонд: 1000 PLN!",
    date: "14.03.2026",
    category: "Турнир",
  },
];

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Новости</h1>
        <p className="mt-2 text-foreground/50">Последние обновления и события портала</p>
      </div>

      <div className="space-y-6">
        {mockNews.map((article) => (
          <Link
            key={article.slug}
            href={`/news/${article.slug}`}
            className="group block overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-all hover:border-accent/30 hover:shadow-lg"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-light">
                {article.category}
              </span>
              <span className="flex items-center gap-1.5 text-foreground/40">
                <Calendar className="h-3.5 w-3.5" />
                {article.date}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-bold transition-colors group-hover:text-accent-light">
              {article.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/50">{article.excerpt}</p>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-accent-light opacity-0 transition-opacity group-hover:opacity-100">
              Читать далее
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
