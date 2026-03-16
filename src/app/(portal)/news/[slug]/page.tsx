import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

const articles: Record<string, { title: string; date: string; category: string; categoryColor: string; content: string }> = {
  launch: {
    title: "Запуск портала 4gk.pl",
    date: "16.03.2026",
    category: "Анонс",
    categoryColor: "bg-blue-50 text-blue-700 border-blue-100",
    content: `Мы рады объявить о запуске нашего нового портала онлайн-игр 4gk.pl!

Наш портал предлагает три увлекательные игры:

**Квиз** — викторина с вопросами из разных категорий: наука, история, география, спорт и многое другое. Играйте одному или соревнуйтесь с другими игроками — до 8 человек одновременно.

**Реакция** — проверьте скорость своей реакции! Нажимайте как можно быстрее после сигнала и сравнивайте свои результаты с другими игроками.

**Память** — тренируйте память, запоминая и воспроизводя последовательности. Каждый раунд становится сложнее!

Все игры доступны прямо в браузере — никаких скачиваний и установок. Просто зарегистрируйтесь и начните играть.

Следите за своим прогрессом на странице результатов и поднимайтесь в рейтинге лучших игроков. Удачи!`,
  },
  "quiz-update": {
    title: "Обновление игры «Квиз»",
    date: "15.03.2026",
    category: "Обновление",
    categoryColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    content: `Мы добавили масштабное обновление для игры «Квиз»!

**Новые категории вопросов:**
- Наука — физика, химия, биология
- История — мировая история и история Польши
- География — столицы, реки, горы
- Литература — классические и современные произведения

Всего добавлено более **500 новых вопросов** разной сложности.

**Улучшенная система подсчёта очков:**
Теперь очки начисляются не только за правильный ответ, но и за скорость. Чем быстрее вы ответите — тем больше очков получите.

**Что дальше?**
В ближайших обновлениях мы планируем добавить категории «Спорт» и «Кино», а также возможность создавать собственные наборы вопросов.`,
  },
  tournament: {
    title: "Первый турнир по «Реакции»",
    date: "14.03.2026",
    category: "Турнир",
    categoryColor: "bg-amber-50 text-amber-700 border-amber-100",
    content: `Объявляем первый официальный турнир на портале 4gk.pl!

**Игра:** Реакция
**Дата:** 1 апреля 2026 года
**Призовой фонд:** 1 000 PLN

**Формат турнира:**
- Квалификация: каждый участник играет 10 раундов, лучшие 16 проходят дальше
- Плей-офф: прямые поединки, одна ошибка — вылет
- Финал: лучшие 4 игрока соревнуются за главный приз

**Как участвовать:**
1. Зарегистрируйтесь на портале 4gk.pl
2. Перейдите в раздел «Реакция» в лобби
3. Нажмите «Присоединиться к турниру» (кнопка появится за день до турнира)

**Призы:**
- 1 место: 500 PLN
- 2 место: 300 PLN
- 3 место: 200 PLN

Регистрация уже открыта. Готовьтесь — тренируйте свою реакцию!`,
  },
};

export async function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return { title: "Не найдено" };
  return {
    title: article.title,
    description: article.content.slice(0, 160),
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug];

  if (!article) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <h1 className="text-xl font-bold">Статья не найдена</h1>
        <Link href="/news" className="mt-3 text-sm font-medium text-muted hover:text-foreground">
          Вернуться к новостям
        </Link>
      </div>
    );
  }

  const paragraphs = article.content.split("\n\n");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link
        href="/news"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Все новости
      </Link>

      <article>
        <div className="flex items-center gap-3">
          <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${article.categoryColor}`}>
            {article.category}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Calendar className="h-3 w-3" />
            {article.date}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          {article.title}
        </h1>

        <div className="mt-8 space-y-4">
          {paragraphs.map((p, i) => {
            const formatted = p
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/^- (.+)/gm, '<li class="ml-4 list-disc">$1</li>')
              .replace(/^\d+\. (.+)/gm, '<li class="ml-4 list-decimal">$1</li>');

            const isList = formatted.includes("<li");

            if (isList) {
              return (
                <ul
                  key={i}
                  className="space-y-1 text-sm leading-relaxed text-muted"
                  dangerouslySetInnerHTML={{ __html: formatted }}
                />
              );
            }

            return (
              <p
                key={i}
                className="text-sm leading-relaxed text-muted"
                dangerouslySetInnerHTML={{ __html: formatted }}
              />
            );
          })}
        </div>
      </article>

      <div className="mt-12 border-t border-border pt-6">
        <Link
          href="/news"
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          &larr; Все новости
        </Link>
      </div>
    </div>
  );
}
