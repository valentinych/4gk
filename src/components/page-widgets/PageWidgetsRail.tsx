"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Loader2, Plus, Trash2, X } from "lucide-react";
import ChgkResults from "@/app/ochp/[slug]/ChgkResults";
import { useToast } from "@/components/Toaster";
import type { PageWidgetDto } from "@/lib/page-widgets";

export function PageWidgetsRail() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === "ADMIN";

  const [widgets, setWidgets] = useState<PageWidgetDto[] | null>(null);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/page-widgets?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("load failed");
      const json = (await res.json()) as { widgets?: PageWidgetDto[] };
      setWidgets(json.widgets ?? []);
    } catch {
      setWidgets([]);
    }
  }, []);

  useEffect(() => {
    setWidgets(null);
    setActiveId(null);
    setOpen(false);
    void load(pathname);
  }, [load, pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeId) setActiveId(null);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, open]);

  const visible = widgets != null && (widgets.length > 0 || isAdmin);
  if (status === "loading" && widgets == null) return null;
  if (!visible) return null;

  const active = widgets?.find((w) => w.id === activeId) ?? null;
  const showingResults = open && active?.broadcastId != null;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/page-widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, title, url, type: "haza" }),
      });
      const json = (await res.json()) as PageWidgetDto & { error?: string };
      if (!res.ok) {
        toast(json.error ?? "Не удалось сохранить", "error");
        return;
      }
      setTitle("");
      setUrl("");
      toast("Плитка добавлена", "success");
      await load(pathname);
    } catch {
      toast("Не удалось сохранить", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Удалить эту плитку с страницы?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/page-widgets/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        toast(json.error ?? "Не удалось удалить", "error");
        return;
      }
      if (activeId === id) setActiveId(null);
      toast("Плитка удалена", "success");
      await load(pathname);
    } catch {
      toast("Не удалось удалить", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Закрыть панель результатов"
          className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/40 md:bg-black/20"
          onClick={() => {
            setActiveId(null);
            setOpen(false);
          }}
        />
      )}

      {!open && (
        <button
          id="cmp-page-widgets-tab"
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/3 z-40 rounded-l-xl border border-r-0 border-border bg-surface px-2 py-3 text-xs font-medium text-foreground shadow-sm hover:bg-surface-hover"
          aria-expanded={false}
          aria-controls="cmp-page-widgets-panel"
        >
          ХаЗа
        </button>
      )}

      {open && (
        <aside
          id="cmp-page-widgets-panel"
          className={`fixed bottom-0 right-0 top-14 z-40 flex flex-col border-l border-border bg-background shadow-xl ${
            showingResults ? "w-full max-w-3xl" : "w-full max-w-md"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Результаты ХаЗа"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            {active ? (
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground"
                aria-label="К списку плиток"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
              {active ? active.title : "Результаты ХаЗа"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setActiveId(null);
                setOpen(false);
              }}
              className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {active?.broadcastId != null ? (
              <ChgkResults broadcastId={active.broadcastId} apiPath="/api/haza" />
            ) : (
              <div className="space-y-3">
                {widgets != null && widgets.length === 0 && !isAdmin ? null : (
                  <ul className="space-y-2">
                    {(widgets ?? []).map((w) => (
                      <li key={w.id}>
                        <div className="flex items-stretch gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (w.broadcastId == null) return;
                              setActiveId(w.id);
                            }}
                            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-3 text-left hover:bg-surface-hover"
                          >
                            <span className="block text-sm font-medium">{w.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted">
                              {w.url}
                            </span>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => void onDelete(w.id)}
                              disabled={deletingId === w.id}
                              className="rounded-xl border border-border px-2.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              aria-label={`Удалить ${w.title}`}
                            >
                              {deletingId === w.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {widgets != null && widgets.length === 0 && isAdmin && (
                  <p className="rounded-xl border border-dashed border-border bg-surface/50 px-3 py-6 text-center text-sm text-muted">
                    На этой странице пока нет плиток ХаЗа.
                  </p>
                )}

                {isAdmin && (
                  <form
                    onSubmit={(e) => void onAdd(e)}
                    className="rounded-xl border border-border bg-surface p-3 space-y-2.5"
                  >
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Добавить компонент ХаЗа
                    </p>
                    <label className="block">
                      <span className="mb-1 block text-xs text-muted">Название плитки</span>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={80}
                        required
                        placeholder="Результаты ХаЗа"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-muted">Ссылка haza.online</span>
                      <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                        placeholder="https://www.haza.online/broadcast/672"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Сохранить
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
