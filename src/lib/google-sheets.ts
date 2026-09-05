/** Parse Google Sheets URLs and load a tab as CSV. */

export const SHEET_ACCESS_ERROR =
  "Таблица недоступна. В Google Таблицах откройте доступ «всем, у кого есть ссылка».";

export interface ParsedGoogleSheet {
  sheetId: string;
  gid: string;
  csvUrl: string;
  viewUrl: string;
  published: boolean;
}

export interface SheetTableData {
  headers: string[];
  rows: string[][];
  viewUrl: string;
}

const SHEET_HOST = /^docs\.google\.com$/i;

export function parseGoogleSheetsUrl(raw: string): ParsedGoogleSheet | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!SHEET_HOST.test(u.hostname)) return null;

  const gid = extractGid(u);
  const path = u.pathname;

  const published = path.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (published) {
    const sheetId = published[1];
    return {
      sheetId,
      gid,
      csvUrl: `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&gid=${gid}`,
      viewUrl: `https://docs.google.com/spreadsheets/d/e/${sheetId}/pubhtml?gid=${gid}`,
      published: true,
    };
  }

  const normal = path.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!normal) return null;
  const sheetId = normal[1];
  return {
    sheetId,
    gid,
    csvUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
    viewUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid}`,
    published: false,
  };
}

function extractGid(u: URL): string {
  const fromQuery = u.searchParams.get("gid");
  if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery;
  const fromHash = u.hash.match(/gid=(\d+)/);
  if (fromHash) return fromHash[1];
  return "0";
}

/** Quoted CSV, same rules as OCHP storm / brain sheet parsers. */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

export function parseCsv(text: string): string[][] {
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/);
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCsvLine(line));
  }
  return trimEmptyEdges(rows);
}

function trimEmptyEdges(rows: string[][]): string[][] {
  let lastRow = rows.length - 1;
  while (lastRow >= 0 && rows[lastRow].every((c) => !c)) lastRow--;
  if (lastRow < 0) return [];
  const sliced = rows.slice(0, lastRow + 1);

  let lastCol = 0;
  for (const row of sliced) {
    for (let i = row.length - 1; i >= 0; i--) {
      if (row[i]) {
        if (i > lastCol) lastCol = i;
        break;
      }
    }
  }
  return sliced.map((row) => {
    const next = row.slice(0, lastCol + 1);
    while (next.length < lastCol + 1) next.push("");
    return next;
  });
}

function looksLikeHtml(text: string, contentType: string | null): boolean {
  if (contentType && contentType.toLowerCase().includes("text/html")) return true;
  const head = text.slice(0, 512).trim().toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.includes("<html") ||
    head.includes("accounts.google.com")
  );
}

export async function fetchSheetTable(parsed: ParsedGoogleSheet): Promise<SheetTableData> {
  const res = await fetch(parsed.csvUrl, { cache: "no-store", redirect: "follow" });
  const text = await res.text();

  if (!res.ok || looksLikeHtml(text, res.headers.get("content-type"))) {
    throw new Error(SHEET_ACCESS_ERROR);
  }

  const grid = parseCsv(text);
  const headers = grid[0] ?? [];
  const rows = grid.slice(1);
  return { headers, rows, viewUrl: parsed.viewUrl };
}
