"use client";

import { Loader2 } from "lucide-react";
import {
  PAGE_WIDGET_BRAIN,
  PAGE_WIDGET_HAZA,
  PAGE_WIDGET_LINK,
  PAGE_WIDGET_TABLE,
  PAGE_WIDGET_TITLE_MAX,
  type PageWidgetType,
} from "@/lib/page-widgets";

const TYPE_CHIPS: { type: PageWidgetType; label: string }[] = [
  { type: PAGE_WIDGET_HAZA, label: "ХаЗа" },
  { type: PAGE_WIDGET_BRAIN, label: "Брейн-ринг" },
  { type: PAGE_WIDGET_LINK, label: "Ссылка" },
  { type: PAGE_WIDGET_TABLE, label: "Таблица" },
];

export function PageWidgetForm({
  title,
  url,
  type,
  saving,
  submitLabel,
  lockType,
  onTitle,
  onUrl,
  onType,
  onSubmit,
  onCancel,
}: {
  title: string;
  url: string;
  type: PageWidgetType;
  saving: boolean;
  submitLabel: string;
  lockType?: boolean;
  onTitle: (v: string) => void;
  onUrl: (v: string) => void;
  onType: (v: PageWidgetType) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}) {
  const urlLabel =
    type === PAGE_WIDGET_LINK
      ? "Ссылка или путь"
      : type === PAGE_WIDGET_TABLE
        ? "Ссылка на Google Таблицу"
        : type === PAGE_WIDGET_BRAIN
          ? ""
          : "Ссылка haza.online";
  const titlePlaceholder =
    type === PAGE_WIDGET_LINK
      ? "Название ссылки"
      : type === PAGE_WIDGET_TABLE
        ? "Результаты"
        : type === PAGE_WIDGET_BRAIN
          ? "Брейн-ринг"
          : "Результаты ХаЗа";

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      {lockType ? null : (
        <div className="flex flex-wrap rounded-lg border border-border p-0.5">
          {TYPE_CHIPS.map((chip) => (
            <button
              key={chip.type}
              type="button"
              aria-pressed={type === chip.type}
              onClick={() => onType(chip.type)}
              className={`min-w-[25%] flex-1 rounded-md px-1.5 py-1.5 text-xs font-medium sm:text-sm ${
                type === chip.type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Название плитки</span>
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          maxLength={PAGE_WIDGET_TITLE_MAX}
          required
          placeholder={titlePlaceholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      {type === PAGE_WIDGET_BRAIN ? null : (
        <label className="block">
          <span className="mb-1 block text-xs text-muted">{urlLabel}</span>
          <input
            value={url}
            onChange={(e) => onUrl(e.target.value)}
            type={type === PAGE_WIDGET_LINK ? "text" : "url"}
            inputMode="url"
            required
            placeholder={
              type === PAGE_WIDGET_LINK
                ? "/dziki-sopot/schedule или https://…"
                : type === PAGE_WIDGET_TABLE
                  ? "https://docs.google.com/spreadsheets/d/…"
                  : "https://www.haza.online/broadcast/672"
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground"
          >
            Отмена
          </button>
        ) : null}
      </div>
    </form>
  );
}
