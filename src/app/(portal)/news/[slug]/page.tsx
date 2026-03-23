import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import NewsArticleView from "./NewsArticleView";

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

  return (
    <NewsArticleView
      article={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        category: article.category,
        content: article.content,
        excerpt: article.excerpt,
        published: article.published,
        publishedAt: article.publishedAt?.toISOString() ?? null,
        createdAt: article.createdAt.toISOString(),
      }}
    />
  );
}
