"use client";

import { Loader2 } from "lucide-react";
import {
  PAGE_WIDGET_HAZA,
  PAGE_WIDGET_LINK,
  type PageWidgetType,
} from "@/lib/page-widgets";

export function PageWidgetForm({
  title,
  url,
  type,
  saving,
  submitLabel,
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
  onTitle: (v: string) => void;
  onUrl: (v: string) => void;
  onType: (v: PageWidgetType) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <div className="flex rounded-lg border border-border p-0.5">
        <button
          type="button"
          aria-pressed={type === PAGE_WIDGET_HAZA}
          onClick={() => onType(PAGE_WIDGET_HAZA)}
          className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium ${
            type === PAGE_WIDGET_HAZA
              ? "bg-background text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          ХаЗа
        </button>
        <button
          type="button"
          aria-pressed={type === PAGE_WIDGET_LINK}
          onClick={() => onType(PAGE_WIDGET_LINK)}
          className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium ${
            type === PAGE_WIDGET_LINK
              ? "bg-background text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          Ссылка
        </button>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Название плитки</span>
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          maxLength={80}
          required
          placeholder={type === PAGE_WIDGET_LINK ? "Название ссылки" : "Результаты ХаЗа"}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">
          {type === PAGE_WIDGET_LINK ? "Ссылка" : "Ссылка haza.online"}
        </span>
        <input
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          type="url"
          required
          placeholder={
            type === PAGE_WIDGET_LINK
              ? "https://example.com"
              : "https://www.haza.online/broadcast/672"
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
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
