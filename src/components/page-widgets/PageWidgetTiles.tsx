"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { GripVertical } from "lucide-react";
import ChgkResults from "@/app/ochp/[slug]/ChgkResults";
import { useToast } from "@/components/Toaster";
import { PageWidgetForm } from "@/components/page-widgets/PageWidgetForm";
import {
  PAGE_WIDGET_HAZA,
  PAGE_WIDGET_LINK,
  PAGE_WIDGETS_CHANGED_EVENT,
  type PageWidgetDto,
  type PageWidgetType,
} from "@/lib/page-widgets";

function tileEmoji(type: string): string {
  if (type === PAGE_WIDGET_LINK) return "🔗";
  if (type === PAGE_WIDGET_HAZA) return "📊";
  return "📌";
}

function asWidgetType(type: string): PageWidgetType {
  return type === PAGE_WIDGET_LINK ? PAGE_WIDGET_LINK : PAGE_WIDGET_HAZA;
}

function moveId(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PageWidgetTiles() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === "ADMIN";

  const [widgets, setWidgets] = useState<PageWidgetDto[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editType, setEditType] = useState<PageWidgetType>(PAGE_WIDGET_HAZA);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

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
    setEditingId(null);
    void load(pathname);
  }, [load, pathname]);

  useEffect(() => {
    const onChange = () => void load(pathname);
    window.addEventListener(PAGE_WIDGETS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PAGE_WIDGETS_CHANGED_EVENT, onChange);
  }, [load, pathname]);

  function notify() {
    window.dispatchEvent(new Event(PAGE_WIDGETS_CHANGED_EVENT));
  }

  function startEdit(w: PageWidgetDto) {
    setEditingId(w.id);
    setEditTitle(w.title);
    setEditUrl(w.url);
    setEditType(asWidgetType(w.type));
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/page-widgets/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, url: editUrl, type: editType }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(json.error ?? "Не удалось сохранить", "error");
        return;
      }
      setEditingId(null);
      toast("Плитка обновлена", "success");
      notify();
      await load(pathname);
    } catch {
      toast("Не удалось сохранить", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Удалить эту плитку с страницы?")) return;
    setBusyId(id);
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
      if (editingId === id) setEditingId(null);
      toast("Плитка удалена", "success");
      notify();
      await load(pathname);
    } catch {
      toast("Не удалось удалить", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleArchive(w: PageWidgetDto) {
    setBusyId(w.id);
    try {
      const res = await fetch(`/api/page-widgets/${encodeURIComponent(w.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !w.archived }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        toast(json.error ?? "Не удалось сохранить", "error");
        return;
      }
      if (w.archived === false && activeId === w.id) setActiveId(null);
      toast(w.archived ? "Плитка возвращена" : "Плитка в архиве", "success");
      notify();
      await load(pathname);
    } catch {
      toast("Не удалось сохранить", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function persistOrder(ids: string[]) {
    try {
      const res = await fetch("/api/page-widgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, ids }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        toast(json.error ?? "Не удалось сохранить порядок", "error");
        await load(pathname);
        return;
      }
      notify();
    } catch {
      toast("Не удалось сохранить порядок", "error");
      await load(pathname);
    }
  }

  function applyReorder(fromId: string, toId: string) {
    if (!widgets || fromId === toId) return;
    const active = widgets.filter((w) => !w.archived);
    const archived = widgets.filter((w) => w.archived);
    const nextIds = moveId(
      active.map((w) => w.id),
      fromId,
      toId,
    );
    if (nextIds.every((id, i) => id === active[i]?.id)) return;
    const byId = new Map(active.map((w) => [w.id, w]));
    const nextActive = nextIds.map((id) => byId.get(id)!);
    setWidgets([...nextActive, ...archived]);
    void persistOrder(nextIds);
  }

  if (!widgets || widgets.length === 0) return null;

  const activeTiles = widgets.filter((w) => !w.archived);
  const archivedTiles = isAdmin ? widgets.filter((w) => w.archived) : [];
  const active = widgets.find((w) => w.id === activeId && !w.archived) ?? null;

  function renderTile(w: PageWidgetDto, draggable: boolean) {
    const selected = activeId === w.id;
    const editing = editingId === w.id;
    const cardClass = `group flex flex-col rounded-xl border border-border bg-surface transition-all ${
      w.archived ? "opacity-50 grayscale" : "hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
    }${selected && !w.archived ? " border-accent/40" : ""}${dragId === w.id ? " opacity-60" : ""}`;
    const innerClass = "flex min-w-0 flex-1 items-start gap-3.5 p-5";
    const body = (
      <>
        <span className="mt-0.5 shrink-0 text-2xl leading-none" aria-hidden>
          {tileEmoji(w.type)}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
            {w.title}
          </span>
        </span>
      </>
    );

    return (
      <div
        key={w.id}
        className={cardClass}
        onDragOver={
          draggable
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            : undefined
        }
        onDrop={
          draggable
            ? (e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData("text/plain") || dragId;
                setDragId(null);
                if (fromId) applyReorder(fromId, w.id);
              }
            : undefined
        }
      >
        {editing ? (
          <div className="p-4">
            <PageWidgetForm
              title={editTitle}
              url={editUrl}
              type={editType}
              saving={saving}
              submitLabel="Сохранить"
              onTitle={setEditTitle}
              onUrl={setEditUrl}
              onType={setEditType}
              onSubmit={(e) => void onSaveEdit(e)}
              onCancel={() => setEditingId(null)}
            />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-stretch">
            {draggable ? (
              <span
                draggable
                onDragStart={(e) => {
                  setDragId(w.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", w.id);
                }}
                onDragEnd={() => setDragId(null)}
                className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center self-stretch text-muted hover:text-foreground active:cursor-grabbing"
                aria-label="Перетащить для изменения порядка"
                title="Перетащить"
              >
                <GripVertical className="h-4 w-4" />
              </span>
            ) : null}
            {w.type === PAGE_WIDGET_LINK ? (
              <a
                href={w.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${innerClass}${w.archived ? " pointer-events-none" : ""}`}
                tabIndex={w.archived ? -1 : undefined}
                aria-disabled={w.archived || undefined}
              >
                {body}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setActiveId((id) => (id === w.id ? null : w.id))}
                className={`${innerClass} text-left${w.archived ? " pointer-events-none" : ""}`}
                aria-expanded={selected}
                disabled={w.archived}
              >
                {body}
              </button>
            )}
          </div>
        )}
        {isAdmin && !editing ? (
          <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
            <button
              type="button"
              onClick={() => startEdit(w)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground"
            >
              Редактировать
            </button>
            <button
              type="button"
              onClick={() => void onDelete(w.id)}
              disabled={busyId === w.id}
              className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
            >
              Удалить
            </button>
            <button
              type="button"
              onClick={() => void onToggleArchive(w)}
              disabled={busyId === w.id}
              className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              {w.archived ? "Вернуть" : "Архивировать"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section
      id="cmp-page-widget-tiles"
      className="mx-auto max-w-5xl px-4 pb-12 sm:px-6"
      aria-label="Плитки страницы"
    >
      {activeTiles.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeTiles.map((w) => renderTile(w, isAdmin))}
        </div>
      ) : null}
      {archivedTiles.length > 0 ? (
        <>
          {activeTiles.length > 0 ? <hr className="my-8 border-border" /> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archivedTiles.map((w) => renderTile(w, false))}
          </div>
        </>
      ) : null}
      {active?.broadcastId != null ? (
        <div className="mt-6">
          <ChgkResults broadcastId={active.broadcastId} apiPath="/api/haza" />
        </div>
      ) : null}
    </section>
  );
}
