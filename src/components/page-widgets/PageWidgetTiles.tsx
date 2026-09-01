"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ChgkResults from "@/app/ochp/[slug]/ChgkResults";
import {
  PAGE_WIDGET_HAZA,
  PAGE_WIDGET_LINK,
  PAGE_WIDGETS_CHANGED_EVENT,
  type PageWidgetDto,
} from "@/lib/page-widgets";

function tileEmoji(type: string): string {
  if (type === PAGE_WIDGET_LINK) return "🔗";
  if (type === PAGE_WIDGET_HAZA) return "📊";
  return "📌";
}

export function PageWidgetTiles() {
  const pathname = usePathname();
  const [widgets, setWidgets] = useState<PageWidgetDto[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

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
    void load(pathname);
  }, [load, pathname]);

  useEffect(() => {
    const onChange = () => void load(pathname);
    window.addEventListener(PAGE_WIDGETS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PAGE_WIDGETS_CHANGED_EVENT, onChange);
  }, [load, pathname]);

  if (!widgets || widgets.length === 0) return null;

  const active = widgets.find((w) => w.id === activeId) ?? null;

  return (
    <section
      id="cmp-page-widget-tiles"
      className="mx-auto max-w-5xl px-4 pb-12 sm:px-6"
      aria-label="Плитки страницы"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((w) => {
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
          const cardClass =
            "group flex flex-col rounded-xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md";
          const innerClass = "flex flex-1 items-start gap-3.5 p-5";

          if (w.type === PAGE_WIDGET_LINK) {
            return (
              <div key={w.id} className={cardClass}>
                <a
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={innerClass}
                >
                  {body}
                </a>
              </div>
            );
          }

          const selected = activeId === w.id;
          return (
            <div
              key={w.id}
              className={`${cardClass}${selected ? " border-accent/40" : ""}`}
            >
              <button
                type="button"
                onClick={() => setActiveId((id) => (id === w.id ? null : w.id))}
                className={`${innerClass} text-left`}
                aria-expanded={selected}
              >
                {body}
              </button>
            </div>
          );
        })}
      </div>
      {active?.broadcastId != null ? (
        <div className="mt-6">
          <ChgkResults broadcastId={active.broadcastId} apiPath="/api/haza" />
        </div>
      ) : null}
    </section>
  );
}
