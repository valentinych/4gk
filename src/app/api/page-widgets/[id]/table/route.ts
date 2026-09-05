import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  fetchSheetTable,
  parseGoogleSheetsUrl,
  SHEET_ACCESS_ERROR,
} from "@/lib/google-sheets";
import { isPrismaMissingTable, PAGE_WIDGET_TABLE } from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const row = await db.pageWidget.findUnique({ where: { id } });
    if (!row || row.archived || row.type !== PAGE_WIDGET_TABLE) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const parsed = parseGoogleSheetsUrl(row.url);
    if (parsed == null) {
      return NextResponse.json(
        { error: "Вставьте ссылку на Google Таблицу (нужен доступ по ссылке)" },
        { status: 400 },
      );
    }

    const data = await fetchSheetTable(parsed);
    return NextResponse.json(data);
  } catch (e) {
    if (isPrismaMissingTable(e)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : SHEET_ACCESS_ERROR;
    const accessDenied = message === SHEET_ACCESS_ERROR;
    return NextResponse.json(
      { error: accessDenied ? SHEET_ACCESS_ERROR : "Не удалось загрузить таблицу" },
      { status: accessDenied ? 403 : 502 },
    );
  }
}
