import { NextResponse } from "next/server";
import { OCHCH_QUIZ_SHEET_URL } from "@/lib/ochch";
import {
  fetchSheetTable,
  parseGoogleSheetsUrl,
  SHEET_ACCESS_ERROR,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  const parsed = parseGoogleSheetsUrl(OCHCH_QUIZ_SHEET_URL);
  if (parsed == null) {
    return NextResponse.json(
      { error: "Не удалось разобрать ссылку на таблицу" },
      { status: 500 },
    );
  }

  try {
    const data = await fetchSheetTable(parsed);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : SHEET_ACCESS_ERROR;
    const accessDenied = message === SHEET_ACCESS_ERROR;
    return NextResponse.json(
      { error: accessDenied ? SHEET_ACCESS_ERROR : "Не удалось загрузить таблицу" },
      { status: accessDenied ? 403 : 502 },
    );
  }
}
