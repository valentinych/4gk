"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Pencil,
  X,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  news: { label: "Новость", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  announcement: { label: "Анонс", color: "bg-blue-50 text-blue-700 border-blue-100" },
  results: { label: "Результаты", color: "bg-amber-50 text-amber-700 border-amber-100" },
  update: { label: "Обновление", color: "bg-violet-50 text-violet-700 border-violet-100" },
};

const NEWS_CATEGORIES = [
  { value: "news", label: "Новость" },
  { value: "announcement", label: "Анонс" },
  { value: "results", label: "Результаты" },
  { value: "update", label: "Обновление" },
] as const;

function getCategoryStyle(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.news;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatContent(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<strong>$1</strong>")
    .replace(/^- (.+)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)/gm, '<li class="ml-4 list-decimal">$1</li>');
}

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  excerpt: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function NewsArticleView({ article: initial }: { article: Article }) {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "ADMIN";

  const [article, setArticle] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: article.title,
    category: article.category,
    content: article.content,
    excerpt: article.excerpt ?? "",
    published: article.published,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setForm({
      title: article.title,
      category: article.category,
      content: article.content,
      excerpt: article.excerpt ?? "",
      published: article.published,
    });
    setEditing(true);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/news/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка при сохранении");
        return;
      }
      const updated = await res.json();
      setArticle({
        ...article,
        title: updated.title,
        category: updated.category,
        content: updated.content,
        excerpt: updated.excerpt,
        published: updated.published,
        publishedAt: updated.publishedAt,
      });
      setEditing(false);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Удалить новость?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/news/${article.id}`, { method: "DELETE" });
      if (res.ok) router.push("/news");
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublished() {
    const res = await fetch(`/api/news/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !article.published }),
    });
    if (res.ok) {
      const updated = await res.json();
      setArticle({ ...article, published: updated.published, publishedAt: updated.publishedAt });
    }
  }

  const cat = getCategoryStyle(article.category);
  const dateStr = formatDate(article.publishedAt ?? article.createdAt);
  const paragraphs = article.content.split("\n\n");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Все новости
        </Link>

        {isAdmin && !editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={togglePublished}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
              title={article.published ? "Снять с публикации" : "Опубликовать"}
            >
              {article.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={startEditing}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              title="Редактировать"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
              title="Удалить"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="rounded-xl border border-border bg-white p-5">
          <h3 className="text-sm font-bold">Редактирование новости</h3>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
              {error}
              <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">✕</button>
            </div>
          )}

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Заголовок *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Категория</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {NEWS_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Краткое описание</label>
              <input
                type="text"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Содержание * <span className="font-normal text-muted/60">(**жирный** или *жирный*, - списки)</span>
              </label>
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={15}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono outline-none focus:border-accent resize-y"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published-edit"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              <label htmlFor="published-edit" className="text-sm text-muted">Опубликовано</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-surface"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Сохранить
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {!article.published && (
            <div className="mb-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
              Черновик — не опубликовано
            </div>
          )}

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
                const formatted = formatContent(p);
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
        </>
      )}
    </div>
  );
}
