"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, X } from "lucide-react";
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

const tabClass =
  "max-h-24 w-8 shrink-0 overflow-hidden rounded-l-xl border border-r-0 border-border bg-surface px-1.5 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-surface-hover";

export function PageWidgetsRail() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === "ADMIN";

  const [widgets, setWidgets] = useState<PageWidgetDto[] | null>(null);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [addType, setAddType] = useState<PageWidgetType>(PAGE_WIDGET_HAZA);
  const [saving, setSaving] = useState(false);

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
    setAdding(false);
    void load(pathname);
  }, [load, pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closePanel() {
    setActiveId(null);
    setAdding(false);
    setOpen(false);
  }

  function openHaza(id: string) {
    if (open && activeId === id && !adding) {
      closePanel();
      return;
    }
    setAdding(false);
    setActiveId(id);
    setOpen(true);
  }

  function openAdd() {
    if (open && adding) {
      closePanel();
      return;
    }
    setActiveId(null);
    setAdding(true);
    setOpen(true);
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/page-widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, title, url, type: addType }),
      });
      const json = (await res.json()) as PageWidgetDto & { error?: string };
      if (!res.ok) {
        toast(json.error ?? "Не удалось сохранить", "error");
        return;
      }
      setTitle("");
      setUrl("");
      toast("Плитка добавлена", "success");
      window.dispatchEvent(new Event(PAGE_WIDGETS_CHANGED_EVENT));
      await load(pathname);
      closePanel();
    } catch {
      toast("Не удалось сохранить", "error");
    } finally {
      setSaving(false);
    }
  }

  if (widgets == null) return null;
  if (status === "loading" && widgets.length === 0) return null;
  if (widgets.length === 0 && !isAdmin) return null;

  const visible = [
    ...widgets.filter((w) => !w.archived),
    ...widgets.filter((w) => w.archived),
  ];
  const active = widgets.find((w) => w.id === activeId) ?? null;
  const showingResults = open && !adding && active?.broadcastId != null;

  const tabs = (
    <div
      className="flex max-h-[min(55vh,calc(100dvh-8rem))] flex-col items-end gap-1 overflow-y-auto"
      aria-label="Плитки страницы"
    >
      {visible.map((w) => {
        const selected = open && !adding && activeId === w.id;
        const labelClass = `${tabClass}${selected ? " border-accent/40 bg-surface-hover" : ""}${
          w.archived ? " opacity-50 grayscale" : ""
        }`;
        const label = (
          <span
            className="block max-h-20 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ writingMode: "vertical-rl" }}
          >
            {w.title}
          </span>
        );
        if (w.type === PAGE_WIDGET_LINK) {
          return (
            <a
              key={w.id}
              href={w.url}
              target="_blank"
              rel="noopener noreferrer"
              className={labelClass}
              title={w.title}
              aria-label={w.title}
            >
              {label}
            </a>
          );
        }
        return (
          <button
            key={w.id}
            type="button"
            aria-expanded={selected}
            title={w.title}
            aria-label={w.title}
            onClick={() => openHaza(w.id)}
            className={labelClass}
          >
            {label}
          </button>
        );
      })}
      {isAdmin ? (
        <button
          type="button"
          onClick={openAdd}
          className={`${tabClass} flex h-8 items-center justify-center ${
            adding && open ? "border-accent/40 bg-surface-hover" : ""
          }`}
          aria-label="Добавить плитку"
          title="Добавить"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Закрыть панель"
          className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/40 md:bg-black/20"
          onClick={closePanel}
        />
      )}

      {!open ? (
        <div id="cmp-page-widgets-tab" className="fixed right-0 top-24 z-40">
          {tabs}
        </div>
      ) : (
        <aside
          id="cmp-page-widgets-panel"
          className={`fixed bottom-0 right-0 top-14 z-40 flex w-full flex-row-reverse ${
            showingResults ? "max-w-3xl" : "max-w-md"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={adding ? "Добавить плитку" : (active?.title ?? "Плитка")}
        >
          <div className="flex shrink-0 flex-col justify-center py-2">{tabs}</div>
          <div className="flex min-w-0 flex-1 flex-col border-l border-border bg-background shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
                {adding ? "Добавить плитку" : (active?.title ?? "")}
              </h2>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {adding ? (
                <div className="rounded-xl border border-border bg-surface p-3">
                  <PageWidgetForm
                    title={title}
                    url={url}
                    type={addType}
                    saving={saving}
                    submitLabel="Сохранить"
                    onTitle={setTitle}
                    onUrl={setUrl}
                    onType={(t) => {
                      setAddType(t);
                      setUrl("");
                    }}
                    onSubmit={(e) => void onAdd(e)}
                  />
                </div>
              ) : active?.broadcastId != null ? (
                <ChgkResults broadcastId={active.broadcastId} apiPath="/api/haza" />
              ) : null}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
