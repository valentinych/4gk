/** Своя игра results: qualifying table + playoff hall grid from public CSV. */

import { fetchSheetCsv, type ParsedGoogleSheet } from "./google-sheets";

export const OCHCH_SI_SHEET_ID = "1EuUNjOOaSvKUZfKFVFHNXlERl7WktOrf3rOivO9hx2s";
export const OCHCH_SI_QUALIFYING_GID = "228027187";
export const OCHCH_SI_PLAYOFF_GID = "127362816";

const SHEET_ERROR =
  /^#(N\/A|Н\/Д|REF!|VALUE!|DIV\/0!|NAME\?|NULL!|NUM!|ERROR!|GETTING_DATA)/i;

export interface SiQualifying {
  headers: string[];
  rows: string[][];
}

export interface SiRoom {
  name: string;
  width: number;
}

export interface SiPlayoffRound {
  title: string;
  /** One entry per hall; each hall is `width` seat cells. Empty string = empty cell. */
  rows: string[][][];
}

export interface SiPlayoff {
  rooms: SiRoom[];
  rounds: SiPlayoffRound[];
}

export interface OchchSiPayload {
  viewUrl: string;
  qualifying: SiQualifying & { viewUrl: string };
  playoff: SiPlayoff & { viewUrl: string };
}

interface RoomSpan extends SiRoom {
  startCol: number;
}

export function cleanSiCell(value: string | undefined): string {
  const v = (value ?? "").replace(/[\r\n]+/g, " ").replace(/[ \t\u00A0]+/g, " ").trim();
  if (!v || SHEET_ERROR.test(v)) return "";
  return v;
}

/** Quoted CSV. Keeps empty rows and newlines inside quotes (a round title may contain one). */
export function parseSiCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((cell) => cleanSiCell(cell)));
}

function trimWidth(rows: string[][]): string[][] {
  let last = -1;
  for (const row of rows) {
    for (let i = row.length - 1; i >= 0; i--) {
      if (row[i]) {
        if (i > last) last = i;
        break;
      }
    }
  }
  if (last < 0) return [];
  return rows.map((row) => {
    const next = row.slice(0, last + 1);
    while (next.length <= last) next.push("");
    return next;
  });
}

/** First row is the header. Later rows are participants, in sheet order. */
export function parseSiQualifying(text: string): SiQualifying {
  const grid = trimWidth(parseSiCsv(text));
  if (grid.length === 0) return { headers: [], rows: [] };
  const headers = grid[0];
  const rows = grid
    .slice(1)
    .map((row) => headers.map((_, i) => row[i] ?? ""))
    .filter((row) => row.some((cell) => cell));
  return { headers, rows };
}

function roomSpans(grid: string[][]): RoomSpan[] {
  const header = grid[0] ?? [];
  const colCount = grid.reduce((max, row) => Math.max(max, row.length), 0);
  const labels: { name: string; col: number }[] = [];
  for (let c = 1; c < colCount; c++) {
    const name = header[c] ?? "";
    if (name) labels.push({ name, col: c });
  }
  if (labels.length === 0) {
    const spans: RoomSpan[] = [];
    for (let c = 1; c < colCount; c++) {
      spans.push({ name: header[c] ?? "", startCol: c, width: 1 });
    }
    return spans;
  }
  return labels.map((label, i) => {
    const nextCol = labels[i + 1]?.col ?? colCount;
    let width = Math.max(1, nextCol - label.col);
    if (i === labels.length - 1 && i > 0) {
      const prev = label.col - labels[i - 1].col;
      width = Math.max(width, prev);
    }
    return { name: label.name, startCol: label.col, width };
  });
}

function seats(row: string[], rooms: RoomSpan[]): string[][] {
  return rooms.map((room) =>
    Array.from({ length: room.width }, (_, k) => row[room.startCol + k] ?? ""),
  );
}

/**
 * Row 0 is hall names. Each hall is a colspan (four seats in this workbook);
 * the last hall often has no trailing empty cells in CSV, so it reuses the
 * previous span. Column A starts a round and applies until the next label.
 * Spacer rows with no seats are dropped. Nothing is inferred as a winner.
 */
export function parseSiPlayoff(text: string): SiPlayoff {
  const grid = parseSiCsv(text).filter((row, idx, all) => {
    if (row.some((cell) => cell)) return true;
    return idx === 0 && all.length > 0;
  });
  while (grid.length > 0 && grid[0].every((cell) => !cell)) grid.shift();
  if (grid.length === 0) return { rooms: [], rounds: [] };

  const rooms = roomSpans(grid);
  const rounds: SiPlayoffRound[] = [];
  let current: SiPlayoffRound | null = null;

  for (const row of grid.slice(1)) {
    const title = row[0] ?? "";
    if (title) {
      current = { title, rows: [] };
      rounds.push(current);
    }
    if (!current) continue;
    const line = seats(row, rooms);
    if (line.some((hall) => hall.some((cell) => cell))) current.rows.push(line);
  }

  return {
    rooms: rooms.map(({ name, width }) => ({ name, width })),
    rounds,
  };
}

function siSheet(gid: string): ParsedGoogleSheet {
  return {
    sheetId: OCHCH_SI_SHEET_ID,
    gid,
    csvUrl: `https://docs.google.com/spreadsheets/d/${OCHCH_SI_SHEET_ID}/export?format=csv&gid=${gid}`,
    viewUrl: `https://docs.google.com/spreadsheets/d/${OCHCH_SI_SHEET_ID}/edit?gid=${gid}`,
    published: false,
  };
}

export async function loadOchchSi(): Promise<OchchSiPayload> {
  const qualifyingSheet = siSheet(OCHCH_SI_QUALIFYING_GID);
  const playoffSheet = siSheet(OCHCH_SI_PLAYOFF_GID);
  const [qualifyingCsv, playoffCsv] = await Promise.all([
    fetchSheetCsv(qualifyingSheet),
    fetchSheetCsv(playoffSheet),
  ]);
  return {
    viewUrl: `https://docs.google.com/spreadsheets/d/${OCHCH_SI_SHEET_ID}/edit`,
    qualifying: { ...parseSiQualifying(qualifyingCsv), viewUrl: qualifyingSheet.viewUrl },
    playoff: { ...parseSiPlayoff(playoffCsv), viewUrl: playoffSheet.viewUrl },
  };
}
