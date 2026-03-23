import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  news: { label: "Новость", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  announcement: { label: "Анонс", color: "bg-blue-50 text-blue-700 border-blue-100" },
  results: { label: "Результаты", color: "bg-amber-50 text-amber-700 border-amber-100" },
  update: { label: "Обновление", color: "bg-violet-50 text-violet-700 border-violet-100" },
};

function getCategoryStyle(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.news;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = await db.newsArticle.findUnique({ where: { slug } });
  if (!article) return { title: "Не найдено" };
  return {
    title: article.title,
    description: article.excerpt || article.content.slice(0, 160),
  };
}

export default async function NewsArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await db.newsArticle.findUnique({ where: { slug } });

  if (!article) notFound();

  const cat = getCategoryStyle(article.category);
  const dateStr = formatDate(article.publishedAt ?? article.createdAt);
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
          <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${cat.color}`}>
            {cat.label}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Calendar className="h-3 w-3" />
            {dateStr}
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
