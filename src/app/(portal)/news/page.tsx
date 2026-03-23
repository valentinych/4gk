"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Calendar,
  ArrowRight,
  Plus,
  X,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";

const NEWS_CATEGORIES = [
  { value: "news", label: "Новость", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { value: "announcement", label: "Анонс", color: "bg-blue-50 text-blue-700 border-blue-100" },
  { value: "results", label: "Результаты", color: "bg-amber-50 text-amber-700 border-amber-100" },
  { value: "update", label: "Обновление", color: "bg-violet-50 text-violet-700 border-violet-100" },
] as const;

function getCategoryStyle(cat: string) {
  return NEWS_CATEGORIES.find((c) => c.value === cat) ?? NEWS_CATEGORIES[0];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
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

const emptyForm = {
  title: "",
  category: "news",
  content: "",
  excerpt: "",
  published: true,
};

export default function NewsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      const url = isAdmin ? "/api/news?all=true" : "/api/news";
      const res = await fetch(url);
      if (res.ok) setArticles(await res.json());
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  function handleEdit(a: Article) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      category: a.category,
      content: a.content,
      excerpt: a.excerpt ?? "",
      published: a.published,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `/api/news/${editingId}` : "/api/news";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка при сохранении");
        return;
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await fetchArticles();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить новость?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      if (res.ok) await fetchArticles();
    } finally {
      setDeleting(null);
    }
  }

  async function togglePublished(a: Article) {
    await fetch(`/api/news/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !a.published }),
    });
    await fetchArticles();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Новости</h1>
          <p className="mt-1 text-sm text-muted">Последние обновления и события портала</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              if (showForm) { setEditingId(null); setForm(emptyForm); }
              setShowForm(!showForm);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Закрыть" : "Добавить"}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="mb-8 rounded-xl border border-border bg-white p-5">
          <h3 className="text-sm font-bold">
            {editingId ? "Редактирование новости" : "Новая новость"}
          </h3>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
              {error}
              <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Заголовок *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Запуск портала 4gk.pl"
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
                placeholder="Будет показано в списке новостей"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Содержание * <span className="font-normal text-muted/60">(поддерживается **жирный**, - списки)</span>
              </label>
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
                placeholder={"Текст новости...\n\n**Жирный текст**\n\n- Элемент списка\n- Ещё один элемент"}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono outline-none focus:border-accent resize-y"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              <label htmlFor="published" className="text-sm text-muted">Опубликовать сразу</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(false); }}
                  className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-surface"
                >
                  Отмена
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Сохранить" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <p className="text-sm text-muted">Новостей пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => {
            const cat = getCategoryStyle(article.category);
            const dateStr = article.publishedAt
              ? formatDate(article.publishedAt)
              : formatDate(article.createdAt);

            return (
              <div
                key={article.id}
                className={`group relative rounded-xl border bg-white p-6 transition-all hover:border-border-hover hover:shadow-sm ${
                  !article.published ? "border-dashed border-border opacity-60" : "border-border"
                }`}
              >
                <Link href={`/news/${article.slug}`} className="block">
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <Calendar className="h-3 w-3" />
                      {dateStr}
                    </span>
                    {!article.published && (
                      <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                        Черновик
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-bold transition-colors group-hover:text-muted">
                    {article.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {article.excerpt || article.content.slice(0, 200)}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted opacity-0 transition-opacity group-hover:opacity-100">
                    Читать далее
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>

                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.preventDefault(); togglePublished(article); }}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
                      title={article.published ? "Снять с публикации" : "Опубликовать"}
                    >
                      {article.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); handleEdit(article); }}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                      title="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); handleDelete(article.id); }}
                      disabled={deleting === article.id}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
                      title="Удалить"
                    >
                      {deleting === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
