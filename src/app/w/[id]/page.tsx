import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ChgkResults from "@/app/ochp/[slug]/ChgkResults";
import { db } from "@/lib/db";
import {
  PAGE_WIDGET_HAZA,
  isPrismaMissingTable,
  parseHazaBroadcastId,
  splitTileTitle,
} from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function loadHazaWidget(id: string) {
  try {
    const row = await db.pageWidget.findUnique({ where: { id } });
    if (!row || row.archived || row.type !== PAGE_WIDGET_HAZA) return null;
    const broadcastId = parseHazaBroadcastId(row.url);
    if (broadcastId == null) return null;
    return { title: row.title, path: row.path, broadcastId };
  } catch (e) {
    if (isPrismaMissingTable(e)) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const widget = await loadHazaWidget(id);
  const { text } = widget ? splitTileTitle(widget.title) : { text: "ХаЗа" };
  return {
    title: text || widget?.title || "ХаЗа",
    robots: { index: false, follow: false },
  };
}

export default async function PageWidgetPage({ params }: Props) {
  const { id } = await params;
  const widget = await loadHazaWidget(id);
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
      <ChgkResults broadcastId={widget.broadcastId} apiPath="/api/haza" />
    </div>
  );
}
