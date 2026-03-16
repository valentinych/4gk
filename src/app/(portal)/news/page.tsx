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
    categoryColor: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    slug: "quiz-update",
    title: "Обновление игры «Квиз»",
    excerpt: "Добавлены новые категории вопросов: наука, история, география. Более 500 новых вопросов ждут вас!",
    date: "15.03.2026",
    category: "Обновление",
    categoryColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    slug: "tournament",
    title: "Первый турнир по «Реакции»",
    excerpt: "Регистрация на первый официальный турнир по игре «Реакция» открыта. Призовой фонд: 1000 PLN!",
    date: "14.03.2026",
    category: "Турнир",
    categoryColor: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Новости</h1>
        <p className="mt-1 text-sm text-muted">Последние обновления и события портала</p>
      </div>

      <div className="space-y-4">
        {mockNews.map((article) => (
          <Link
            key={article.slug}
            href={`/news/${article.slug}`}
            className="group block rounded-xl border border-border bg-white p-6 transition-all hover:border-border-hover hover:shadow-sm"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${article.categoryColor}`}>
                {article.category}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Calendar className="h-3 w-3" />
                {article.date}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-bold transition-colors group-hover:text-muted">
              {article.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{article.excerpt}</p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted opacity-0 transition-opacity group-hover:opacity-100">
              Читать далее
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
