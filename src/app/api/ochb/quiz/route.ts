import { NextResponse } from "next/server";
import { SHEET_ACCESS_ERROR } from "@/lib/google-sheets";
import { loadOchbQuizFresh } from "@/lib/ochb-quiz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const board = await loadOchbQuizFresh();
    return NextResponse.json(board, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : SHEET_ACCESS_ERROR;
    const accessDenied = message === SHEET_ACCESS_ERROR;
    return NextResponse.json(
      { error: accessDenied ? SHEET_ACCESS_ERROR : "Не удалось загрузить таблицу" },
      { status: accessDenied ? 403 : 502 },
    );
  }
}
