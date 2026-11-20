import { db } from "@/lib/db";
import { DS_CURRENT_TILES } from "@/lib/dziki-sopot-seasons";
import { parseGoogleSheetsUrl } from "@/lib/google-sheets";
import {
  buildOchpCurrentSeasonTiles,
  ochpChgkHazaBroadcastAllowlist,
  ochpLandingTileHref,
  OCHP_GLOBAL_TILES,
} from "@/lib/ochp-seasons";
import {
  OCHB_CHANNEL_URL,
  OCHB_HAZA_BROADCAST_ID,
  OCHB_PATH,
  ochbStaticTiles,
} from "@/lib/ochb";
import { OCHCH_CURRENT_TILES, OCHCH_PATH } from "@/lib/ochch";
import { SYRENY_LITE } from "@/lib/syreny-lite";
import { turnirushkiHazaBroadcastAllowlist } from "@/lib/turnirushki-games";

export const PAGE_WIDGET_HAZA = "haza";
export const PAGE_WIDGET_LINK = "link";
export const PAGE_WIDGET_BRAIN = "brain";
export const PAGE_WIDGET_TABLE = "table";
export const PAGE_WIDGETS_CHANGED_EVENT = "4gk:page-widgets-changed";
export const PAGE_WIDGET_TITLE_MAX = 280;

export const DS_HAZA_WIDGET_PATH = "/dziki-sopot";
export const DS_HAZA_WIDGET_URL = "https://www.haza.online/broadcast/672";
export const DS_HAZA_WIDGET_TITLE = "Результаты ХаЗа";

/** Widget rows for the current OCHP season stay on this path; the page is `/ochp/2026`. */
export const OCHP_WIDGET_PATH = "/ochp";
export const SYRENY_WIDGET_PATH = "/mazowieckie-syreny-lite";
export const OCHCH_WIDGET_PATH = OCHCH_PATH;
export const OCHB_WIDGET_PATH = OCHB_PATH;

/**
 * Archived row that records a finished /ochb seed.
 * Hidden from the tile API so an admin delete is not recreated on the next load.
 */
export const OCHB_SEED_MARKER_URL = "seed:/ochb";

/**
 * Archived row that records the one-shot swap of «Полезные ссылки» for the
 * channel tile, plus «Спорные» and «Апелляции». A later admin delete stays deleted.
 */
export const OCHB_JURY_SEED_MARKER_URL = "seed:/ochb/jury";

/**
 * Archived row that records the one-shot insert of «Регламент».
 * A later admin delete stays deleted.
 */
export const OCHB_REGLAMENT_SEED_MARKER_URL = "seed:/ochb/reglament";

export function isOchbSeedMarkerUrl(url: string): boolean {
  return (
    url === OCHB_SEED_MARKER_URL ||
    url === OCHB_JURY_SEED_MARKER_URL ||
    url === OCHB_REGLAMENT_SEED_MARKER_URL
  );
}

/** Landings that render PageWidgetTiles in their own tile slot (not the root layout). */
export const PAGE_WIDGET_EMBEDDED_PATHS = new Set<string>([
  DS_HAZA_WIDGET_PATH,
  OCHP_WIDGET_PATH,
  SYRENY_WIDGET_PATH,
  OCHCH_WIDGET_PATH,
  OCHB_WIDGET_PATH,
]);

/** Dedicated page for a widget with on-site content (Haza / brain / table). */
export function pageWidgetPagePath(id: string): string {
  return `/w/${id}`;
}

/** Widget standings pages — no tile grid / rail of their own. */
export function isPageWidgetUtilityPath(pathname: string): boolean {
  return pathname === "/w" || pathname.startsWith("/w/");
}

export interface PageWidgetSeed {
  type: PageWidgetType;
  title: string;
  url: string;
}

export type PageWidgetType =
  | typeof PAGE_WIDGET_HAZA
  | typeof PAGE_WIDGET_LINK
  | typeof PAGE_WIDGET_BRAIN
  | typeof PAGE_WIDGET_TABLE;

export function asPageWidgetType(type: string): PageWidgetType {
  if (type === PAGE_WIDGET_LINK) return PAGE_WIDGET_LINK;
  if (type === PAGE_WIDGET_BRAIN) return PAGE_WIDGET_BRAIN;
  if (type === PAGE_WIDGET_TABLE) return PAGE_WIDGET_TABLE;
  return PAGE_WIDGET_HAZA;
}

export function brainWidgetUrl(): string {
  return `brain:${crypto.randomUUID()}`;
}

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

export function ochchCurrentWidgetSeeds(): PageWidgetSeed[] {
  return OCHCH_CURRENT_TILES.map((t) => seedLink(t.emoji, t.title, t.href, t.note));
}

export function ochbCurrentWidgetSeeds(): PageWidgetSeed[] {
  return ochbStaticTiles().map((tile) => {
    if (tile.slug === "chgk") {
      return {
        type: PAGE_WIDGET_HAZA,
        title: seedTitle(tile.emoji, tile.title),
        url: hazaBroadcastUrl(OCHB_HAZA_BROADCAST_ID),
      };
    }
    return seedLink(tile.emoji, tile.title, tile.href);
  });
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

/** Missing table, or Postgres cannot be reached. The page can fall back to static tiles. */
export function isPrismaUnavailable(e: unknown): boolean {
  if (isPrismaMissingTable(e)) return true;
  if (typeof e !== "object" || e === null) return false;
  const name = "name" in e ? String((e as { name?: unknown }).name) : "";
  if (name === "PrismaClientInitializationError") return true;
  const code = "code" in e ? String((e as { code?: unknown }).code) : "";
  return code === "P1001" || code === "P1017";
}

export function uniqueWidgetConflictMessage(type: string): string {
  if (type === PAGE_WIDGET_LINK) return "Такая ссылка уже добавлена на эту страницу";
  if (type === PAGE_WIDGET_BRAIN) return "Такой брейн-ринг уже добавлен на эту страницу";
  if (type === PAGE_WIDGET_TABLE) return "Такая таблица уже добавлена на эту страницу";
  return "Такая трансляция уже добавлена на эту страницу";
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
  if (
    type !== PAGE_WIDGET_HAZA &&
    type !== PAGE_WIDGET_LINK &&
    type !== PAGE_WIDGET_BRAIN &&
    type !== PAGE_WIDGET_TABLE
  ) {
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

  if (type === PAGE_WIDGET_BRAIN) {
    const url = rawUrl.startsWith("brain:") && rawUrl.length > 6 ? rawUrl : brainWidgetUrl();
    return { title, url, type };
  }

  if (type === PAGE_WIDGET_TABLE) {
    if (!rawUrl) {
      return { error: "Укажите ссылку на Google Таблицу" };
    }
    const parsed = parseGoogleSheetsUrl(rawUrl);
    if (parsed == null) {
      return { error: "Вставьте ссылку на Google Таблицу (нужен доступ по ссылке)" };
    }
    return { title, url: parsed.viewUrl, type };
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

const OCHB_LINKS_WIDGET_URL = "/ochb/links";
const OCHB_REGLAMENT_WIDGET_URL = "/ochb/reglament";

async function createArchivedSeedMarker(path: string, url: string): Promise<void> {
  const last = await db.pageWidget.findFirst({
    where: { path },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  try {
    await db.pageWidget.create({
      data: {
        path,
        type: PAGE_WIDGET_LINK,
        title: "seed",
        url,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        archived: true,
      },
    });
  } catch (e) {
    if (isPrismaUniqueConflict(e)) return;
    throw e;
  }
}

/**
 * One shot. Turns the «Полезные ссылки» tile into «Телеграм-канал» when that
 * channel tile is missing, archives any other links tile, and inserts
 * спорные / апелляции / the channel only if those rows are absent.
 * The marker blocks a later run, so an admin delete is not recreated.
 */
async function ensureOchbJuryAndChannelWidgets(path: string): Promise<void> {
  const marker = await db.pageWidget.findUnique({
    where: {
      path_type_url: {
        path,
        type: PAGE_WIDGET_LINK,
        url: OCHB_JURY_SEED_MARKER_URL,
      },
    },
    select: { id: true },
  });
  if (marker) return;

  const [linksRows, channel] = await Promise.all([
    db.pageWidget.findMany({
      where: {
        path,
        OR: [
          { url: OCHB_LINKS_WIDGET_URL },
          { title: { contains: "Полезные ссылки" } },
        ],
      },
    }),
    db.pageWidget.findUnique({
      where: {
        path_type_url: {
          path,
          type: PAGE_WIDGET_LINK,
          url: OCHB_CHANNEL_URL,
        },
      },
      select: { id: true },
    }),
  ]);

  let channelExists = channel != null;
  for (const row of linksRows) {
    const canBecomeChannel =
      !channelExists &&
      row.type === PAGE_WIDGET_LINK &&
      row.url === OCHB_LINKS_WIDGET_URL;
    if (canBecomeChannel) {
      try {
        await db.pageWidget.update({
          where: { id: row.id },
          data: {
            title: seedTitle("📣", "Телеграм-канал"),
            url: OCHB_CHANNEL_URL,
            archived: false,
          },
        });
        channelExists = true;
        continue;
      } catch (e) {
        if (!isPrismaUniqueConflict(e)) throw e;
      }
    }
    if (!row.archived) {
      await db.pageWidget.update({
        where: { id: row.id },
        data: { archived: true },
      });
    }
  }

  await ensurePageWidgets(path, [
    seedLink("📣", "Телеграм-канал", OCHB_CHANNEL_URL),
    seedLink("💬", "Спорные", "/ochb/controversial"),
    seedLink("⚖️", "Апелляции", "/ochb/appeals"),
  ]);
  await createArchivedSeedMarker(path, OCHB_JURY_SEED_MARKER_URL);
}

/**
 * One shot. Appends «Регламент» when that row is missing.
 * The marker blocks a later run, so an admin delete is not recreated.
 * Existing tiles keep their order.
 */
async function ensureOchbReglamentWidget(path: string): Promise<void> {
  const marker = await db.pageWidget.findUnique({
    where: {
      path_type_url: {
        path,
        type: PAGE_WIDGET_LINK,
        url: OCHB_REGLAMENT_SEED_MARKER_URL,
      },
    },
    select: { id: true },
  });
  if (marker) return;

  await ensurePageWidgets(path, [
    seedLink("📜", "Регламент", OCHB_REGLAMENT_WIDGET_URL),
  ]);
  await createArchivedSeedMarker(path, OCHB_REGLAMENT_SEED_MARKER_URL);
}

/**
 * Inserts /ochb tiles once. The marker stays after an admin deletes every visible tile,
 * so those tiles are not created again. The jury/channel and reglament passes are also one-shot.
 */
async function ensureOchbLandingWidgets(path: string): Promise<void> {
  const marker = await db.pageWidget.findUnique({
    where: {
      path_type_url: {
        path,
        type: PAGE_WIDGET_LINK,
        url: OCHB_SEED_MARKER_URL,
      },
    },
    select: { id: true },
  });
  if (!marker) {
    await ensurePageWidgets(path, ochbCurrentWidgetSeeds());
    await createArchivedSeedMarker(path, OCHB_SEED_MARKER_URL);
  }
  await ensureOchbJuryAndChannelWidgets(path);
  await ensureOchbReglamentWidget(path);
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
    return;
  }
  if (path === OCHB_WIDGET_PATH) {
    await ensureOchbLandingWidgets(path);
    return;
  }
  if (path === OCHCH_WIDGET_PATH) {
    const seeds = ochchCurrentWidgetSeeds();
    await ensurePageWidgets(path, seeds);
    for (const seed of seeds) {
      await db.pageWidget.updateMany({
        where: {
          path,
          type: seed.type,
          url: seed.url,
          title: { not: seed.title },
        },
        data: { title: seed.title },
      });
    }
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
