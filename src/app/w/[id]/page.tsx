import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ChgkResults from "@/app/ochp/[slug]/ChgkResults";
import { BrainRingWidgetClient } from "@/components/page-widgets/BrainRingWidgetClient";
import { TableWidgetClient } from "@/components/page-widgets/TableWidgetClient";
import { db } from "@/lib/db";
import {
  PAGE_WIDGET_BRAIN,
  PAGE_WIDGET_HAZA,
  PAGE_WIDGET_TABLE,
  isPrismaMissingTable,
  parseHazaBroadcastId,
  splitTileTitle,
} from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type LoadedWidget =
  | { kind: "haza"; title: string; path: string; broadcastId: number }
  | { kind: "brain"; title: string; path: string; id: string }
  | { kind: "table"; title: string; path: string; id: string };

async function loadWidget(id: string): Promise<LoadedWidget | null> {
  try {
    const row = await db.pageWidget.findUnique({ where: { id } });
    if (!row || row.archived) return null;
    if (row.type === PAGE_WIDGET_HAZA) {
      const broadcastId = parseHazaBroadcastId(row.url);
      if (broadcastId == null) return null;
      return { kind: "haza", title: row.title, path: row.path, broadcastId };
    }
    if (row.type === PAGE_WIDGET_BRAIN) {
      return { kind: "brain", title: row.title, path: row.path, id: row.id };
    }
    if (row.type === PAGE_WIDGET_TABLE) {
      return { kind: "table", title: row.title, path: row.path, id: row.id };
    }
    return null;
  } catch (e) {
    if (isPrismaMissingTable(e)) return null;
    throw e;
  }
}

function fallbackTitle(kind: LoadedWidget["kind"] | undefined): string {
  if (kind === "brain") return "Брейн-ринг";
  if (kind === "table") return "Таблица";
  return "ХаЗа";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const widget = await loadWidget(id);
  const fallback = fallbackTitle(widget?.kind);
  const { text } = widget ? splitTileTitle(widget.title) : { text: fallback };
  return {
    title: text || widget?.title || fallback,
    robots: { index: false, follow: false },
  };
}

export default async function PageWidgetPage({ params }: Props) {
  const { id } = await params;
  const widget = await loadWidget(id);
  if (!widget) notFound();

  const { text } = splitTileTitle(widget.title);

  return (
    <div id="page-widget" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href={widget.path}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        {text || widget.title}
      </h1>
      {widget.kind === "haza" ? (
        <ChgkResults broadcastId={widget.broadcastId} apiPath="/api/haza" />
      ) : widget.kind === "brain" ? (
        <BrainRingWidgetClient widgetId={widget.id} />
      ) : (
        <TableWidgetClient widgetId={widget.id} />
      )}
    </div>
  );
}
