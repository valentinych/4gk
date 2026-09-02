import { db } from "@/lib/db";
import { DS_CURRENT_TILES } from "@/lib/dziki-sopot-seasons";
import {
  buildOchpCurrentSeasonTiles,
  ochpChgkHazaBroadcastAllowlist,
  ochpLandingTileHref,
  OCHP_GLOBAL_TILES,
} from "@/lib/ochp-seasons";
import { SYRENY_LITE } from "@/lib/syreny-lite";
import { turnirushkiHazaBroadcastAllowlist } from "@/lib/turnirushki-games";

export const PAGE_WIDGET_HAZA = "haza";
export const PAGE_WIDGET_LINK = "link";
export const PAGE_WIDGETS_CHANGED_EVENT = "4gk:page-widgets-changed";
export const PAGE_WIDGET_TITLE_MAX = 160;

export const DS_HAZA_WIDGET_PATH = "/dziki-sopot";
export const DS_HAZA_WIDGET_URL = "https://www.haza.online/broadcast/672";
export const DS_HAZA_WIDGET_TITLE = "Результаты ХаЗа";

export const OCHP_WIDGET_PATH = "/ochp";
export const SYRENY_WIDGET_PATH = "/mazowieckie-syreny-lite";

/** Landings that render PageWidgetTiles in their own tile slot (not the root layout). */
export const PAGE_WIDGET_EMBEDDED_PATHS = new Set<string>([
  DS_HAZA_WIDGET_PATH,
  OCHP_WIDGET_PATH,
  SYRENY_WIDGET_PATH,
]);

export interface PageWidgetSeed {
  type: PageWidgetType;
  title: string;
  url: string;
}

export type PageWidgetType = typeof PAGE_WIDGET_HAZA | typeof PAGE_WIDGET_LINK;

export interface PageWidgetDto {
  id: string;
  path: string;
  type: string;
  title: string;
  url: string;
  sortOrder: number;
  archived: boolean;
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

/** Canonical http(s) URL, or null if not a valid web URL. */
export function parseHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function isHttpWidgetUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/** Same-origin path (`/foo` or `/foo?bar=1`). */
export function parseInternalWidgetUrl(raw: string): string | null {
  let path = raw.trim();
  if (!path.startsWith("/")) return null;
  if (path.includes("..") || path.includes("//")) return null;
  const h = path.indexOf("#");
  if (h >= 0) path = path.slice(0, h);
  if (path.length < 1 || path.length > 300) return null;
  if (!/^\/[A-Za-z0-9\-._/~]*(\?[A-Za-z0-9\-._=&%~+]*)?$/.test(path)) return null;
  return path;
}

const EMOJI_PREFIX =
  /^(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\d\uFE0F?\u20E3)\s+/u;

/** Leading emoji in the title is shown as the tile icon. */
export function splitTileTitle(title: string): { emoji: string; text: string } {
  const m = title.match(EMOJI_PREFIX);
  if (!m) return { emoji: "", text: title };
  return { emoji: m[1], text: title.slice(m[0].length) };
}

function seedTitle(emoji: string, title: string, note?: string): string {
  const suffix = note ? ` (${note})` : "";
  return `${emoji} ${title}${suffix}`;
}

function seedLink(emoji: string, title: string, url: string, note?: string): PageWidgetSeed {
  return { type: PAGE_WIDGET_LINK, title: seedTitle(emoji, title, note), url };
}

export function dsCurrentWidgetSeeds(): PageWidgetSeed[] {
  return DS_CURRENT_TILES.flatMap((t) =>
    t.href ? [seedLink(t.emoji, t.title, t.href, t.note)] : [],
  );
}

export function ochpCurrentWidgetSeeds(): PageWidgetSeed[] {
  return [...buildOchpCurrentSeasonTiles(), ...OCHP_GLOBAL_TILES].map((t) =>
    seedLink(t.emoji, t.title, ochpLandingTileHref(t)),
  );
}

export function syrenyWidgetSeeds(): PageWidgetSeed[] {
  return [
    seedLink("👥", "Список команд · Заявка", "/mazowieckie-syreny-lite/participants"),
    seedLink("📋", "Подать состав", `/account/roster/${SYRENY_LITE.id}`),
    seedLink("🎯", "КСИ", "/mazowieckie-syreny-lite/ksi"),
    seedLink("🔔", "Брейн-ринг", "/mazowieckie-syreny-lite/brain-ring"),
    seedLink("❓", "Что? Где? Когда?", "/mazowieckie-syreny-lite/chgk"),
  ];
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

export function uniqueWidgetConflictMessage(type: string): string {
  return type === PAGE_WIDGET_LINK
    ? "Такая ссылка уже добавлена на эту страницу"
    : "Такая трансляция уже добавлена на эту страницу";
}

export function isPrismaUniqueConflict(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

/** Validate title/url/type for create and update. */
export function resolveWidgetFields(input: {
  title?: unknown;
  url?: unknown;
  type?: unknown;
}): { error: string } | { title: string; url: string; type: PageWidgetType } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > PAGE_WIDGET_TITLE_MAX) {
    return { error: `Укажите название плитки (до ${PAGE_WIDGET_TITLE_MAX} символов)` };
  }

  const type =
    typeof input.type === "string" && input.type.trim() ? input.type.trim() : PAGE_WIDGET_HAZA;
  if (type !== PAGE_WIDGET_HAZA && type !== PAGE_WIDGET_LINK) {
    return { error: "Неизвестный тип плитки" };
  }

  const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
  if (type === PAGE_WIDGET_HAZA) {
    const broadcastId = parseHazaBroadcastId(rawUrl);
    if (broadcastId == null) {
      return { error: "Вставьте ссылку вида https://www.haza.online/broadcast/672" };
    }
    return { title, url: hazaBroadcastUrl(broadcastId), type };
  }

  if (rawUrl.startsWith("/")) {
    const path = parseInternalWidgetUrl(rawUrl);
    if (path == null) {
      return { error: "Укажите путь вида /dziki-sopot/schedule" };
    }
    return { title, url: path, type };
  }

  const parsed = parseHttpUrl(rawUrl);
  if (parsed == null) {
    return { error: "Укажите ссылку http://, https:// или путь /…" };
  }
  return { title, url: parsed, type };
}

export function toPageWidgetDto(row: {
  id: string;
  path: string;
  type: string;
  title: string;
  url: string;
  sortOrder: number;
  archived: boolean;
  createdAt: Date;
}): PageWidgetDto {
  return {
    id: row.id,
    path: row.path,
    type: row.type,
    title: row.title,
    url: row.url,
    sortOrder: row.sortOrder,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    broadcastId: row.type === PAGE_WIDGET_HAZA ? parseHazaBroadcastId(row.url) : null,
  };
}

async function ensurePageWidgets(path: string, seeds: PageWidgetSeed[]): Promise<void> {
  for (const seed of seeds) {
    const existing = await db.pageWidget.findUnique({
      where: { path_type_url: { path, type: seed.type, url: seed.url } },
    });
    if (existing) continue;
    const last = await db.pageWidget.findFirst({
      where: { path },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    try {
      await db.pageWidget.create({
        data: {
          path,
          type: seed.type,
          title: seed.title,
          url: seed.url,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
    } catch (e) {
      if (isPrismaUniqueConflict(e)) continue;
      throw e;
    }
  }
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
  const last = await db.pageWidget.findFirst({
    where: { path: DS_HAZA_WIDGET_PATH },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  try {
    await db.pageWidget.create({
      data: {
        path: DS_HAZA_WIDGET_PATH,
        type: PAGE_WIDGET_HAZA,
        title: DS_HAZA_WIDGET_TITLE,
        url: DS_HAZA_WIDGET_URL,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  } catch (e) {
    if (isPrismaUniqueConflict(e)) return;
    throw e;
  }
}

/** Idempotent seed of current-season landing tiles. Does not update existing rows. */
export async function ensureLandingWidgets(path: string): Promise<void> {
  if (path === DS_HAZA_WIDGET_PATH) {
    const before = await db.pageWidget.findMany({
      where: { path },
      select: { id: true, type: true, url: true },
    });
    const seeds = dsCurrentWidgetSeeds();
    await ensurePageWidgets(path, seeds);
    await ensureDsHazaWidget();
    const onlyHazaBefore =
      before.length === 1 &&
      before[0].type === PAGE_WIDGET_HAZA &&
      before[0].url === DS_HAZA_WIDGET_URL;
    if (onlyHazaBefore) {
      const last = await db.pageWidget.findFirst({
        where: { path, id: { not: before[0].id } },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      await db.pageWidget.update({
        where: { id: before[0].id },
        data: { sortOrder: (last?.sortOrder ?? seeds.length) + 1 },
      });
    }
    return;
  }
  if (path === OCHP_WIDGET_PATH) {
    await ensurePageWidgets(path, ochpCurrentWidgetSeeds());
    return;
  }
  if (path === SYRENY_WIDGET_PATH) {
    await ensurePageWidgets(path, syrenyWidgetSeeds());
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
