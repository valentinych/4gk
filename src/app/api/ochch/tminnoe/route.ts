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

function isMagicNumberHeader(label: string): boolean {
  return label.trim().toLowerCase() === "magic number";
}

/** Numeric place only. Blank and non-numeric cells sort after placed teams. */
function placeValue(cell: string): number | null {
  const t = cell.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function dropMagicNumber(
  headers: string[],
  summary: string[][],
  rows: string[][],
): { headers: string[]; summary: string[][]; rows: string[][] } {
  const keep = headers
    .map((header, index) => (isMagicNumberHeader(header) ? -1 : index))
    .filter((index) => index >= 0);
  if (keep.length === headers.length) return { headers, summary, rows };
  const pick = (row: string[]) => keep.map((index) => row[index] ?? "");
  return {
    headers: pick(headers),
    summary: summary.map(pick),
    rows: rows.map(pick),
  };
}

function sortByPlace(headers: string[], rows: string[][]): string[][] {
  const placeIdx = headers.findIndex((header) => header.trim() === "Место");
  if (placeIdx < 0) return rows;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const pa = placeValue(a.row[placeIdx] ?? "");
      const pb = placeValue(b.row[placeIdx] ?? "");
      if (pa == null && pb == null) return a.index - b.index;
      if (pa == null) return 1;
      if (pb == null) return -1;
      if (pa !== pb) return pa - pb;
      return a.index - b.index;
    })
    .map(({ row }) => row);
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
  const visible = dropMagicNumber(headers, summary, rows);
  return {
    headers: visible.headers,
    summary: visible.summary,
    rows: sortByPlace(visible.headers, visible.rows),
  };
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
