"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, X } from "lucide-react";
import { useToast } from "@/components/Toaster";
import { PageWidgetForm } from "@/components/page-widgets/PageWidgetForm";
import { DS_UPCOMING_YEAR } from "@/lib/dziki-sopot-seasons";
import { OCHP_SEASON_START_MAX } from "@/lib/ochp-seasons";
import {
  DS_HAZA_WIDGET_PATH,
  OCHP_WIDGET_PATH,
  PAGE_WIDGET_BRAIN,
  PAGE_WIDGET_HAZA,
  PAGE_WIDGET_LINK,
  PAGE_WIDGETS_CHANGED_EVENT,
  isPageWidgetUtilityPath,
  pageWidgetPagePath,
  splitTileTitle,
  type PageWidgetDto,
  type PageWidgetType,
} from "@/lib/page-widgets";

function isArchiveLanding(pathname: string, searchParams: URLSearchParams): boolean {
  if (pathname === DS_HAZA_WIDGET_PATH) {
    const y = searchParams.get("year");
    return y != null && y !== "" && y !== String(DS_UPCOMING_YEAR);
  }
  if (pathname === OCHP_WIDGET_PATH) {
    const s = searchParams.get("season");
    return s != null && s !== "" && s !== String(OCHP_SEASON_START_MAX);
  }
  return false;
}

type RailTab = "haza" | "brain" | "link" | "add";

const tabChip =
  "shrink-0 rounded-l-lg border border-r-0 border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

function tileEmoji(type: string, title: string): string {
  const { emoji } = splitTileTitle(title);
  if (emoji) return emoji;
  if (type === PAGE_WIDGET_LINK) return "🔗";
  if (type === PAGE_WIDGET_HAZA) return "📊";
  if (type === PAGE_WIDGET_BRAIN) return "🧠";
  return "📌";
}

function tileLabel(title: string): string {
  const { text } = splitTileTitle(title);
  return text || title;
}

export function PageWidgetsRail() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const archiveLanding = isArchiveLanding(pathname, searchParams);
  const skipRail = archiveLanding || isPageWidgetUtilityPath(pathname);
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === "ADMIN";

  const [widgets, setWidgets] = useState<PageWidgetDto[] | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<RailTab | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [addType, setAddType] = useState<PageWidgetType>(PAGE_WIDGET_HAZA);
  const [lockType, setLockType] = useState(false);
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
    if (skipRail) return;
    setWidgets(null);
    setOpen(false);
    setTab(null);
    void load(pathname);
  }, [load, pathname, skipRail]);

  useEffect(() => {
    if (skipRail) return;
    const onChange = () => void load(pathname);
    window.addEventListener(PAGE_WIDGETS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PAGE_WIDGETS_CHANGED_EVENT, onChange);
  }, [load, pathname, skipRail]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closePanel() {
    setTab(null);
    setOpen(false);
    setLockType(false);
  }

  function resetForm(type: PageWidgetType) {
    setTitle("");
    setUrl("");
    setAddType(type);
  }

  function openType(next: RailTab) {
    if (open && tab === next) {
      closePanel();
      return;
    }
    if (next === "add") {
      setLockType(false);
      resetForm(PAGE_WIDGET_HAZA);
      setTab("add");
      setOpen(true);
      return;
    }

    const list = (widgets ?? []).filter((w) => w.type === next && !w.archived);
    if ((next === "haza" || next === "brain") && list.length === 1) {
      closePanel();
      router.push(pageWidgetPagePath(list[0].id));
      return;
    }
    if (list.length === 0 && isAdmin) {
      setLockType(true);
      resetForm(next);
      setTab("add");
      setOpen(true);
      return;
    }
    setLockType(false);
    setTab(next);
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
      toast("Плитка добавлена", "success");
      window.dispatchEvent(new Event(PAGE_WIDGETS_CHANGED_EVENT));
      await load(pathname);
      if ((addType === PAGE_WIDGET_HAZA || addType === PAGE_WIDGET_BRAIN) && json.id) {
        closePanel();
        router.push(pageWidgetPagePath(json.id));
      } else {
        setTab("link");
        setLockType(false);
        resetForm(addType);
      }
    } catch {
      toast("Не удалось сохранить", "error");
    } finally {
      setSaving(false);
    }
  }

  if (skipRail) return null;
  if (widgets == null) return null;
  if (status === "loading" && widgets.length === 0) return null;

  const activeHaza = widgets.filter((w) => w.type === PAGE_WIDGET_HAZA && !w.archived);
  const activeBrain = widgets.filter((w) => w.type === PAGE_WIDGET_BRAIN && !w.archived);
  const activeLinks = widgets.filter((w) => w.type === PAGE_WIDGET_LINK && !w.archived);
  const showHazaTab = isAdmin || activeHaza.length > 0;
  const showBrainTab = isAdmin || activeBrain.length > 0;
  const showLinkTab = isAdmin || activeLinks.length > 0;

  if (!isAdmin && !showHazaTab && !showBrainTab && !showLinkTab) return null;

  const adding = open && tab === "add";

  function tabSelected(id: RailTab): boolean {
    if (!open) return false;
    if (id === "add") return tab === "add" && !lockType;
    if (id === "haza") return tab === "haza" || (tab === "add" && lockType && addType === PAGE_WIDGET_HAZA);
    if (id === "brain") return tab === "brain" || (tab === "add" && lockType && addType === PAGE_WIDGET_BRAIN);
    return tab === "link" || (tab === "add" && lockType && addType === PAGE_WIDGET_LINK);
  }

  const tabs = (
    <div className="flex flex-col items-end gap-1" aria-label="Типы плиток">
      {showHazaTab ? (
        activeHaza.length === 1 ? (
          <Link
            href={pageWidgetPagePath(activeHaza[0].id)}
            aria-label="ХаЗа"
            className={tabChip}
          >
            ХаЗа
          </Link>
        ) : (
          <button
            type="button"
            aria-expanded={tabSelected("haza")}
            aria-label="ХаЗа"
            onClick={() => openType("haza")}
            className={`${tabChip}${tabSelected("haza") ? " border-accent/40 bg-surface-hover" : ""}`}
          >
            ХаЗа
          </button>
        )
      ) : null}
      {showBrainTab ? (
        activeBrain.length === 1 ? (
          <Link
            href={pageWidgetPagePath(activeBrain[0].id)}
            aria-label="Брейн-ринг"
            className={tabChip}
          >
            Брейн-ринг
          </Link>
        ) : (
          <button
            type="button"
            aria-expanded={tabSelected("brain")}
            aria-label="Брейн-ринг"
            onClick={() => openType("brain")}
            className={`${tabChip}${tabSelected("brain") ? " border-accent/40 bg-surface-hover" : ""}`}
          >
            Брейн-ринг
          </button>
        )
      ) : null}
      {showLinkTab ? (
        <button
          type="button"
          aria-expanded={tabSelected("link")}
          aria-label="Ссылка"
          onClick={() => openType("link")}
          className={`${tabChip}${tabSelected("link") ? " border-accent/40 bg-surface-hover" : ""}`}
        >
          Ссылка
        </button>
      ) : null}
      {isAdmin ? (
        <button
          type="button"
          onClick={() => openType("add")}
          className={`${tabChip} flex h-8 w-8 items-center justify-center p-0 ${
            tabSelected("add") ? " border-accent/40 bg-surface-hover" : ""
          }`}
          aria-label="Добавить плитку"
          title="Добавить"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  const heading =
    adding && lockType && addType === PAGE_WIDGET_HAZA
      ? "ХаЗа"
      : adding && lockType && addType === PAGE_WIDGET_BRAIN
        ? "Брейн-ринг"
        : adding && lockType && addType === PAGE_WIDGET_LINK
          ? "Ссылка"
          : adding
            ? "Добавить плитку"
            : tab === "haza"
              ? "ХаЗа"
              : tab === "brain"
                ? "Брейн-ринг"
                : tab === "link"
                  ? "Ссылка"
                  : "";

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
          className="fixed bottom-0 right-0 top-14 z-40 flex w-full max-w-md flex-row-reverse"
          role="dialog"
          aria-modal="true"
          aria-label={heading || "Плитки"}
        >
          <div className="flex shrink-0 flex-col justify-center py-2">{tabs}</div>
          <div className="flex min-w-0 flex-1 flex-col border-l border-border bg-background shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{heading}</h2>
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
                    lockType={lockType}
                    onTitle={setTitle}
                    onUrl={setUrl}
                    onType={(t) => {
                      setAddType(t);
                      setUrl("");
                    }}
                    onSubmit={(e) => void onAdd(e)}
                  />
                </div>
              ) : null}

              {open && tab === "haza" ? (
                activeHaza.length > 0 ? (
                  <ul className="space-y-1">
                    {activeHaza.map((w) => (
                      <li key={w.id}>
                        <Link
                          href={pageWidgetPagePath(w.id)}
                          onClick={closePanel}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
                        >
                          <span aria-hidden>{tileEmoji(w.type, w.title)}</span>
                          <span className="min-w-0 truncate">{tileLabel(w.title)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-1 text-sm text-muted">Нет трансляций ХаЗа на этой странице</p>
                )
              ) : null}

              {open && tab === "brain" ? (
                activeBrain.length > 0 ? (
                  <ul className="space-y-1">
                    {activeBrain.map((w) => (
                      <li key={w.id}>
                        <Link
                          href={pageWidgetPagePath(w.id)}
                          onClick={closePanel}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
                        >
                          <span aria-hidden>{tileEmoji(w.type, w.title)}</span>
                          <span className="min-w-0 truncate">{tileLabel(w.title)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-1 text-sm text-muted">Нет брейн-ринга на этой странице</p>
                )
              ) : null}

              {open && tab === "link" ? (
                activeLinks.length > 0 ? (
                  <ul className="space-y-1">
                    {activeLinks.map((w) => (
                      <li key={w.id}>
                        <a
                          href={w.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
                        >
                          <span aria-hidden>{tileEmoji(w.type, w.title)}</span>
                          <span className="min-w-0 truncate">{tileLabel(w.title)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-1 text-sm text-muted">Нет ссылок на этой странице</p>
                )
              ) : null}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
