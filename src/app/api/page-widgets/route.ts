import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { requireAdmin } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ensureLandingWidgets,
  isPrismaMissingTable,
  isPrismaUniqueConflict,
  normalizePagePath,
  resolveWidgetFields,
  toPageWidgetDto,
  uniqueWidgetConflictMessage,
} from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = normalizePagePath(searchParams.get("path"));
  if (!path) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    await ensureLandingWidgets(path);

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";

    const rows = await db.pageWidget.findMany({
      where: isAdmin ? { path } : { path, archived: false },
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

  const fields = resolveWidgetFields(body);
  if ("error" in fields) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
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
        type: fields.type,
        title: fields.title,
        url: fields.url,
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
    if (isPrismaUniqueConflict(e)) {
      return NextResponse.json(
        { error: uniqueWidgetConflictMessage(fields.type) },
        { status: 409 },
      );
    }
    console.error("page-widgets create failed", e);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}

/** Reorder active (non-archived) widgets. Body: `{ path, ids: string[] }`. */
export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { path?: unknown; ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const path = normalizePagePath(typeof body.path === "string" ? body.path : null);
  if (!path) {
    return NextResponse.json({ error: "Некорректный путь страницы" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string" || !id)) {
    return NextResponse.json({ error: "Некорректный порядок плиток" }, { status: 400 });
  }
  const ids = body.ids as string[];

  try {
    const active = await db.pageWidget.findMany({
      where: { path, archived: false },
      select: { id: true },
    });
    const expected = new Set(active.map((r) => r.id));
    if (ids.length !== expected.size || ids.some((id) => !expected.has(id))) {
      return NextResponse.json({ error: "Некорректный порядок плиток" }, { status: 400 });
    }
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: "Некорректный порядок плиток" }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ ok: true });
    }

    await db.$transaction(
      ids.map((id, i) => db.pageWidget.update({ where: { id }, data: { sortOrder: i } })),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("page-widgets reorder failed", e);
    return NextResponse.json({ error: "Не удалось сохранить порядок" }, { status: 500 });
  }
}
