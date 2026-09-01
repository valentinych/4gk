import { db } from "@/lib/db";
import { ochpChgkHazaBroadcastAllowlist } from "@/lib/ochp-seasons";
import { turnirushkiHazaBroadcastAllowlist } from "@/lib/turnirushki-games";

export const PAGE_WIDGET_HAZA = "haza";

export const DS_HAZA_WIDGET_PATH = "/dziki-sopot";
export const DS_HAZA_WIDGET_URL = "https://www.haza.online/broadcast/672";
export const DS_HAZA_WIDGET_TITLE = "Результаты ХаЗа";

export interface PageWidgetDto {
  id: string;
  path: string;
  type: string;
  title: string;
  url: string;
  sortOrder: number;
  createdAt: string;
  broadcastId: number | null;
}

export function normalizePagePath(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let path = raw.trim();
  if (!path.startsWith("/")) return null;
  const q = path.indexOf("?");
  if (q >= 0) path = path.slice(0, q);
  const h = path.indexOf("#");
  if (h >= 0) path = path.slice(0, h);
  if (path.length > 200) return null;
  if (path.includes("..") || path.includes("//")) return null;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (!/^\/[A-Za-z0-9\-._/~]*$/.test(path)) return null;
  return path;
}

export function parseHazaBroadcastId(url: string): number | null {
  try {
    const u = new URL(url.trim());
    if (!/^(www\.)?haza\.online$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/broadcast\/(\d+)\/?$/);
    if (!m) return null;
    const id = parseInt(m[1], 10);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function hazaBroadcastUrl(broadcastId: number): string {
  return `https://www.haza.online/broadcast/${broadcastId}`;
}

export function isPrismaMissingTable(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2021"
  );
}

export function toPageWidgetDto(row: {
  id: string;
  path: string;
  type: string;
  title: string;
  url: string;
  sortOrder: number;
  createdAt: Date;
}): PageWidgetDto {
  return {
    id: row.id,
    path: row.path,
    type: row.type,
    title: row.title,
    url: row.url,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    broadcastId: parseHazaBroadcastId(row.url),
  };
}

/** Idempotent — attaches the Dziki Sopot Haza tile if missing. */
export async function ensureDsHazaWidget(): Promise<void> {
  const existing = await db.pageWidget.findUnique({
    where: {
      path_type_url: {
        path: DS_HAZA_WIDGET_PATH,
        type: PAGE_WIDGET_HAZA,
        url: DS_HAZA_WIDGET_URL,
      },
    },
  });
  if (existing) return;
  try {
    await db.pageWidget.create({
      data: {
        path: DS_HAZA_WIDGET_PATH,
        type: PAGE_WIDGET_HAZA,
        title: DS_HAZA_WIDGET_TITLE,
        url: DS_HAZA_WIDGET_URL,
        sortOrder: 0,
      },
    });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return;
    }
    throw e;
  }
}

export async function isAllowedHazaBroadcastId(broadcastId: number): Promise<boolean> {
  if (ochpChgkHazaBroadcastAllowlist().includes(broadcastId)) return true;
  if (turnirushkiHazaBroadcastAllowlist().includes(broadcastId)) return true;
  const hit = await db.pageWidget.findFirst({
    where: { type: PAGE_WIDGET_HAZA, url: hazaBroadcastUrl(broadcastId) },
    select: { id: true },
  });
  return hit != null;
}
