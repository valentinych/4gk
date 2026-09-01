import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  DS_HAZA_WIDGET_PATH,
  PAGE_WIDGET_HAZA,
  PAGE_WIDGET_LINK,
  ensureDsHazaWidget,
  hazaBroadcastUrl,
  isPrismaMissingTable,
  normalizePagePath,
  parseHazaBroadcastId,
  parseHttpUrl,
  toPageWidgetDto,
} from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = normalizePagePath(searchParams.get("path"));
  if (!path) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    if (path === DS_HAZA_WIDGET_PATH) {
      await ensureDsHazaWidget();
    }

    const rows = await db.pageWidget.findMany({
      where: { path },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ widgets: rows.map(toPageWidgetDto) });
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json({ widgets: [] });
    }
    console.error("page-widgets list failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { path?: unknown; title?: unknown; url?: unknown; type?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const path = normalizePagePath(typeof body.path === "string" ? body.path : null);
  if (!path) {
    return NextResponse.json({ error: "Некорректный путь страницы" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 80) {
    return NextResponse.json({ error: "Укажите название плитки (до 80 символов)" }, { status: 400 });
  }

  const type = typeof body.type === "string" && body.type.trim() ? body.type.trim() : PAGE_WIDGET_HAZA;
  if (type !== PAGE_WIDGET_HAZA && type !== PAGE_WIDGET_LINK) {
    return NextResponse.json({ error: "Неизвестный тип плитки" }, { status: 400 });
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  let url: string;
  if (type === PAGE_WIDGET_HAZA) {
    const broadcastId = parseHazaBroadcastId(rawUrl);
    if (broadcastId == null) {
      return NextResponse.json(
        { error: "Вставьте ссылку вида https://www.haza.online/broadcast/672" },
        { status: 400 },
      );
    }
    url = hazaBroadcastUrl(broadcastId);
  } else {
    const parsed = parseHttpUrl(rawUrl);
    if (parsed == null) {
      return NextResponse.json(
        { error: "Укажите ссылку http:// или https://" },
        { status: 400 },
      );
    }
    url = parsed;
  }

  try {
    const last = await db.pageWidget.findFirst({
      where: { path },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const row = await db.pageWidget.create({
      data: {
        path,
        type,
        title,
        url,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json(toPageWidgetDto(row), { status: 201 });
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json(
        { error: "Таблица PageWidget ещё не создана. Нужен prisma db push." },
        { status: 503 },
      );
    }
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            type === PAGE_WIDGET_LINK
              ? "Такая ссылка уже добавлена на эту страницу"
              : "Такая трансляция уже добавлена на эту страницу",
        },
        { status: 409 },
      );
    }
    console.error("page-widgets create failed", e);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
