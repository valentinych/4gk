import { NextResponse } from "next/server";
import { SHEET_ACCESS_ERROR } from "@/lib/google-sheets";
import { loadOchchSi } from "@/lib/ochch-si";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadOchchSi());
  } catch (e) {
    const message = e instanceof Error ? e.message : SHEET_ACCESS_ERROR;
    const accessDenied = message === SHEET_ACCESS_ERROR;
    return NextResponse.json(
      { error: accessDenied ? SHEET_ACCESS_ERROR : "Не удалось загрузить таблицу" },
      { status: accessDenied ? 403 : 502 },
    );
  }
}
