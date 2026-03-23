import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  const articles = await db.newsArticle.findMany({
    where: all ? undefined : { published: true },
    orderBy: { publishedAt: "desc" },
  });

  return NextResponse.json(articles);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
        ж: "zh", з: "z", и: "i", й: "j", к: "k", л: "l", м: "m",
        н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
        ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
        ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Заголовок обязателен" }, { status: 400 });
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Содержание обязательно" }, { status: 400 });
  }

  let slug = body.slug?.trim() ? slugify(body.slug.trim()) : slugify(body.title.trim());

  const existing = await db.newsArticle.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const published = !!body.published;

  const article = await db.newsArticle.create({
    data: {
      title: body.title.trim(),
      slug,
      category: body.category?.trim() || "news",
      content: body.content.trim(),
      excerpt: body.excerpt?.trim() || body.content.trim().slice(0, 200),
      published,
      publishedAt: published ? new Date() : null,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
