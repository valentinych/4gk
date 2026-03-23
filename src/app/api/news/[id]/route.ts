import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const article = await db.newsArticle.findFirst({
    where: { OR: [{ id }, { slug: id }] },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.newsArticle.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title.trim();
  if (body.category !== undefined) data.category = body.category.trim() || "news";
  if (body.content !== undefined) data.content = body.content.trim();
  if (body.excerpt !== undefined) data.excerpt = body.excerpt?.trim() || null;

  if (body.published !== undefined) {
    data.published = !!body.published;
    if (body.published && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
    if (!body.published) {
      data.publishedAt = null;
    }
  }

  const updated = await db.newsArticle.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.newsArticle.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.newsArticle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
