import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { isPrismaMissingTable } from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
