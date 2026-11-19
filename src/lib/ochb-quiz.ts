/** OCHB quiz «Вопроситос» from the public workbook. */

import { fetchSheetCsv, parseCsv, type ParsedGoogleSheet } from "./google-sheets";

export const OCHB_QUIZ_SHEET_ID = "1mKqi6_nk6rBC8h1qieuase8wqqiSjzkHAiJ7OuUZVcI";

/**
 * Only tab (Sheet1). `export?format=csv&gid=0` is a flat score table:
 * Команда, the stage columns, and Финальный счёт. There is no Rank column
 * and no per-question grid, so the page does not open a detail row.
 * Formula cells that the sheet stores as 0 stay 0. A blank cell stays blank.
 */
export const OCHB_QUIZ_GID = "0";

export const OCHB_QUIZ_VIEW_URL = `https://docs.google.com/spreadsheets/d/${OCHB_QUIZ_SHEET_ID}/edit?gid=${OCHB_QUIZ_GID}`;

/** A few minutes: a refresh picks up new scores without a redeploy. */
export const OCHB_QUIZ_REVALIDATE_SECONDS = 180;

const READ_ERROR = "Не удалось прочитать таблицу квиза.";

/** Prefer the final total over a generic Sum. Intermediate totals are not this list. */
const TOTAL_HEADERS = ["финальный счет", "final score", "final", "сумма", "sum"];

export interface OchbQuizRow {
  /** Sheet row index. Stable when a later poll still has this row. */
  order: number;
  /**
   * Sheet place, or a computed place when the sheet has none.
   * Empty when the row is unranked (blank total, or Rank 0 / blank).
   */
  rank: string;
  name: string;
  /** Raw cells aligned with {@link OchbQuizBoard.columns}. */
  cells: string[];
}

export interface OchbQuizBoard {
  viewUrl: string;
  /** "Место" when computed, the sheet header when the sheet has a place, else "". */
  rankHeader: string;
  teamHeader: string;
  columns: string[];
  /** Index into `columns` of the total, or -1. */
  totalColumn: number;
  teams: OchbQuizRow[];
}

interface Draft {
  order: number;
  rank: string;
  name: string;
  cells: string[];
  total: string;
}

function sheet(): ParsedGoogleSheet {
  return {
    sheetId: OCHB_QUIZ_SHEET_ID,
    gid: OCHB_QUIZ_GID,
    csvUrl: `https://docs.google.com/spreadsheets/d/${OCHB_QUIZ_SHEET_ID}/export?format=csv&gid=${OCHB_QUIZ_GID}`,
    viewUrl: OCHB_QUIZ_VIEW_URL,
    published: false,
  };
}

function cell(row: string[], index: number): string {
  return (row[index] ?? "").trim();
}

function normHeader(value: string): string {
  return value.trim().toLowerCase().replaceAll("ё", "е");
}

function isPlaceHeader(value: string): boolean {
  const t = normHeader(value);
  return t === "rank" || t === "место" || t === "place" || t === "№" || t === "#";
}

function isTeamHeader(value: string): boolean {
  const t = normHeader(value);
  return t === "команда" || t === "team" || t === "player" || t === "игрок";
}

function isTotalHeader(value: string): boolean {
  return TOTAL_HEADERS.includes(normHeader(value));
}

function findTotalColumn(header: string[]): number {
  const norms = header.map(normHeader);
  for (const name of TOTAL_HEADERS) {
    const idx = norms.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

function scoreNumber(raw: string): number | null {
  const t = raw.trim().replace(/[\s\u00A0\u202F]/g, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * A positive Rank (1, 2, 3, …) is a place and sorts ascending.
 * Rank 0, blank, and non-numeric are unranked: they follow every place, in sheet order.
 * The same place keeps sheet order.
 */
function rankNumber(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(t)) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Same total → same place; the next distinct total skips (1, 1, 3). Blank stays unranked. */
function assignPlaces(drafts: Draft[]): void {
  let lastN: number | null = null;
  let lastPlace = 0;
  let seen = 0;
  for (const row of drafts) {
    const n = scoreNumber(row.total);
    if (n == null) {
      row.rank = "";
      continue;
    }
    seen += 1;
    const place = lastN != null && n === lastN ? lastPlace : seen;
    row.rank = String(place);
    lastN = n;
    lastPlace = place;
  }
}

export function parseOchbQuizGrid(grid: string[][], viewUrl: string): OchbQuizBoard {
  const headerIdx = grid.findIndex((row) =>
    row.some((value) => isTeamHeader(value) || isPlaceHeader(value) || isTotalHeader(value)),
  );
  if (headerIdx < 0) throw new Error(READ_ERROR);
  const header = grid[headerIdx].map((value) => value.trim());
  const teamCol = header.findIndex(isTeamHeader);
  if (teamCol < 0) throw new Error(READ_ERROR);
  const placeCol = header.findIndex(isPlaceHeader);
  const totalCol = findTotalColumn(header);

  const columnIndexes: number[] = [];
  for (let c = 0; c < header.length; c++) {
    if (c === teamCol || c === placeCol) continue;
    columnIndexes.push(c);
  }
  if (columnIndexes.length === 0 && placeCol < 0) throw new Error(READ_ERROR);

  const drafts: Draft[] = [];
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    const name = cell(row, teamCol);
    const rank = placeCol >= 0 ? cell(row, placeCol) : "";
    const cells = columnIndexes.map((c) => cell(row, c));
    if (!name && !rank && cells.every((value) => !value)) continue;
    drafts.push({
      order: r,
      rank,
      name,
      cells,
      total: totalCol >= 0 ? cell(row, totalCol) : "",
    });
  }

  if (placeCol >= 0) {
    drafts.sort((a, b) => {
      const ra = rankNumber(a.rank);
      const rb = rankNumber(b.rank);
      if (ra == null && rb == null) return a.order - b.order;
      if (ra == null) return 1;
      if (rb == null) return -1;
      if (ra !== rb) return ra - rb;
      return a.order - b.order;
    });
  } else if (totalCol >= 0) {
    drafts.sort((a, b) => {
      const sa = scoreNumber(a.total);
      const sb = scoreNumber(b.total);
      if (sa == null && sb == null) return a.order - b.order;
      if (sa == null) return 1;
      if (sb == null) return -1;
      if (sa !== sb) return sb - sa;
      return a.order - b.order;
    });
    assignPlaces(drafts);
  }

  return {
    viewUrl,
    rankHeader: placeCol >= 0 ? header[placeCol] : totalCol >= 0 ? "Место" : "",
    teamHeader: header[teamCol],
    columns: columnIndexes.map((c) => header[c]),
    totalColumn: columnIndexes.indexOf(totalCol),
    teams: drafts.map((row) => ({
      order: row.order,
      rank: row.rank,
      name: row.name,
      cells: row.cells,
    })),
  };
}

export async function loadOchbQuiz(): Promise<OchbQuizBoard> {
  const parsed = sheet();
  const text = await fetchSheetCsv(parsed, { revalidate: OCHB_QUIZ_REVALIDATE_SECONDS });
  return parseOchbQuizGrid(parseCsv(text), parsed.viewUrl);
}

/**
 * Same table as {@link loadOchbQuiz} for the 60-second poll.
 * Omits `revalidate`, so this request uses `cache: "no-store"` and does not
 * read the page's 3-minute fetch cache. Other sheet fetches are unchanged.
 */
export async function loadOchbQuizFresh(): Promise<OchbQuizBoard> {
  const parsed = sheet();
  const text = await fetchSheetCsv(parsed);
  return parseOchbQuizGrid(parseCsv(text), parsed.viewUrl);
}
