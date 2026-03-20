import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

const articles: Record<string, { title: string; date: string; category: string; categoryColor: string; content: string }> = {
  launch: {
    title: "Запуск портала 4gk.pl",
    date: "16.03.2026",
    category: "Анонс",
    categoryColor: "bg-blue-50 text-blue-700 border-blue-100",
    content: `Портал 4gk.pl запущен в тестовом режиме!

**Что это?**
4gk.pl — информационный портал для сообщества интеллектуальных игр в Польше. Здесь мы собираем результаты турниров, расписания и полезную информацию для игроков.

**Что уже работает:**
- Страница Чемпионата Варшавы с результатами ЧГК, КСИ и ИСИ
- Страница ОЧП'26 с расписанием, списком участников, регламентом и онлайн-результатами
- Авторизация через Google и привязка профиля rating.chgk.info

**Тестовый режим**
Сайт находится в стадии активной разработки. Некоторые разделы могут быть недоступны или работать с ограничениями. Мы будем постепенно добавлять новые функции и наполнять портал содержимым.

Если вы заметили ошибку или у вас есть предложения — пишите в Telegram-канал **@chgkpolska**.`,
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
