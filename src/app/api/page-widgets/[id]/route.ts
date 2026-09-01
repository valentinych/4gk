import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  isPrismaMissingTable,
  isPrismaUniqueConflict,
  resolveWidgetFields,
  toPageWidgetDto,
  uniqueWidgetConflictMessage,
} from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { title?: unknown; url?: unknown; type?: unknown; archived?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const existing = await db.pageWidget.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: { title?: string; url?: string; type?: string; archived?: boolean } = {};

    if (body.archived !== undefined) {
      data.archived = Boolean(body.archived);
    }

    const editingFields =
      body.title !== undefined || body.url !== undefined || body.type !== undefined;
    if (editingFields) {
      const fields = resolveWidgetFields({
        title: body.title !== undefined ? body.title : existing.title,
        url: body.url !== undefined ? body.url : existing.url,
        type: body.type !== undefined ? body.type : existing.type,
      });
      if ("error" in fields) {
        return NextResponse.json({ error: fields.error }, { status: 400 });
      }
      data.title = fields.title;
      data.url = fields.url;
      data.type = fields.type;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(toPageWidgetDto(existing));
    }

    const row = await db.pageWidget.update({ where: { id }, data });
    return NextResponse.json(toPageWidgetDto(row));
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (isPrismaUniqueConflict(e)) {
      return NextResponse.json(
        {
          error: uniqueWidgetConflictMessage(
            typeof body.type === "string" ? body.type : "",
          ),
        },
        { status: 409 },
      );
    }
    console.error("page-widgets patch failed", e);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const existing = await db.pageWidget.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.pageWidget.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("page-widgets delete failed", e);
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
