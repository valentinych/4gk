import { NextResponse } from "next/server";
import { OCHCH_TMINNOE_SHEET_URL } from "@/lib/ochch";
import {
  fetchSheetCsv,
  parseCsv,
  parseGoogleSheetsUrl,
  SHEET_ACCESS_ERROR,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

function padRow(row: string[], width: number): string[] {
  const next = row.slice(0, width);
  while (next.length < width) next.push("");
  return next;
}

/** Header is the № / Команда / Место row. Point-value rows sit above it. */
function parseTminnoeGrid(grid: string[][]): {
  headers: string[];
  summary: string[][];
  rows: string[][];
} {
  const headerIdx = grid.findIndex(
    (row) => row.includes("№") && row.includes("Команда") && row.includes("Место"),
  );
  if (headerIdx < 0) return { headers: [], summary: [], rows: [] };

  const headers = grid[headerIdx];
  const width = headers.length;
  const filled = (row: string[]) => row.some((cell) => cell);
  const summary = grid
    .slice(0, headerIdx)
    .filter(filled)
    .map((row) => padRow(row, width));
  const rows = grid
    .slice(headerIdx + 1)
    .filter(filled)
    .map((row) => padRow(row, width));
  return { headers, summary, rows };
}

export async function GET() {
  const parsed = parseGoogleSheetsUrl(OCHCH_TMINNOE_SHEET_URL);
  if (parsed == null) {
    return NextResponse.json(
      { error: "Не удалось разобрать ссылку на таблицу" },
      { status: 500 },
    );
  }

  try {
    const text = await fetchSheetCsv(parsed);
    const table = parseTminnoeGrid(parseCsv(text));
    return NextResponse.json({ ...table, viewUrl: parsed.viewUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : SHEET_ACCESS_ERROR;
    const accessDenied = message === SHEET_ACCESS_ERROR;
    return NextResponse.json(
      { error: accessDenied ? SHEET_ACCESS_ERROR : "Не удалось загрузить таблицу" },
      { status: accessDenied ? 403 : 502 },
    );
  }
}
