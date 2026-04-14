import { NextResponse } from "next/server";
import { computePoc, extractSheetId } from "@/lib/parsers/poc-calculator";

export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url") ?? "";

  const sheetId = extractSheetId(raw);
  if (!sheetId) {
    return NextResponse.json({ error: "Неверная ссылка на Google Sheets" }, { status: 400 });
  }

  try {
    const result = await computePoc(sheetId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POC] computation error", err);
    return NextResponse.json(
      { error: "Не удалось загрузить данные. Убедитесь, что таблица открыта для чтения." },
      { status: 500 },
    );
  }
}
