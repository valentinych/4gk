/** OCHB Своя игра from the public «Барса-КСИ» workbook. */

import { fetchSheetCsv, parseCsv, type ParsedGoogleSheet } from "./google-sheets";

export const OCHB_SI_SHEET_ID = "1bLncFYCZ73ZQWM8pdMBCh0oQ91JaezKGxhfGYB36mYI";

/**
 * Only tab. `export?format=csv&gid=0` is the grid with Rank and Round 1–20.
 * Each round is six columns: question cells 10, 20, 30, 40, 50, then Σ.
 * A question cell is blank until it is played. The sheet stores a plus as 1
 * and a minus as -1; the page shows that mark times the column stake
 * (10, 20, 30, 40, 50). A cell that already holds the stake is left as written.
 * Σ is the sheet total and is not recomputed.
 * Columns pluses / pluses rank / full rank are game-wide counts, not topics.
 */
export const OCHB_SI_GID = "0";

export const OCHB_SI_VIEW_URL = `https://docs.google.com/spreadsheets/d/${OCHB_SI_SHEET_ID}/edit?gid=${OCHB_SI_GID}`;

/** A few minutes: a refresh picks up new scores without a redeploy. */
export const OCHB_SI_REVALIDATE_SECONDS = 180;

const READ_ERROR = "Не удалось прочитать таблицу Своей игры.";
const TOPIC_HEADER = /^Round\s+\d+$/i;
const SKIP_HEADERS = new Set([
  "бланк",
  "rank",
  "sum",
  "player",
  "команда",
  "team",
  "pluses",
  "pluses rank",
  "full rank",
]);

export interface OchbSiMark {
  /** Subheader, e.g. "10". */
  label: string;
  /** Stake for this question. Empty when it has not been played. */
  value: string;
}

export interface OchbSiTopic {
  /** Sheet header, e.g. "Round 1". */
  name: string;
  /** Raw Σ cell. */
  sum: string;
  marks: OchbSiMark[];
}

export interface OchbSiTeam {
  /** Raw Rank cell. Empty when the sheet left it blank. */
  rank: string;
  name: string;
  sum: string;
  topics: OchbSiTopic[];
}

export interface OchbSiBoard {
  viewUrl: string;
  rankHeader: string;
  teamHeader: string;
  sumHeader: string;
  topicNames: string[];
  teams: OchbSiTeam[];
}

interface TopicSpan {
  name: string;
  start: number;
  end: number;
}

function sheet(): ParsedGoogleSheet {
  return {
    sheetId: OCHB_SI_SHEET_ID,
    gid: OCHB_SI_GID,
    csvUrl: `https://docs.google.com/spreadsheets/d/${OCHB_SI_SHEET_ID}/export?format=csv&gid=${OCHB_SI_GID}`,
    viewUrl: OCHB_SI_VIEW_URL,
    published: false,
  };
}

function cell(row: string[], index: number): string {
  return (row[index] ?? "").trim();
}

const QUESTION_STAKES = new Set([10, 20, 30, 40, 50]);

/**
 * Question cells are a plus/minus mark: 1, -1, or a bare + / − / -.
 * Display is sign × the column stake. Blank stays blank.
 * 10, 20, -30 and the other stakes are already points, so they are not scaled again.
 */
function questionPoints(raw: string, label: string): string {
  const value = raw.trim();
  if (!value) return "";
  const nominal = Number(label);
  if (!QUESTION_STAKES.has(nominal)) return value;
  const mark = value.replace(/[−–]/g, "-");
  if (mark === "1" || mark === "+1" || mark === "+") return String(nominal);
  if (mark === "-1" || mark === "-") return String(-nominal);
  return value;
}

function nextHeader(header: string[], from: number): number {
  for (let i = from + 1; i < header.length; i++) {
    if (header[i].trim()) return i;
  }
  return header.length;
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

function topicSpans(header: string[], sub: string[]): TopicSpan[] {
  const spans: TopicSpan[] = [];
  for (let c = 0; c < header.length; c++) {
    const name = header[c].trim();
    if (!name || SKIP_HEADERS.has(name.toLowerCase())) continue;
    const end = nextHeader(header, c);
    const labels = sub.slice(c, end).map((value) => value.trim());
    if (!TOPIC_HEADER.test(name) && !labels.includes("Σ")) continue;
    spans.push({ name, start: c, end });
  }
  return spans;
}

function teamColumn(header: string[], firstTopic: number): number {
  const named = header.findIndex((value) => {
    const t = value.trim().toLowerCase();
    return t === "player" || t === "команда" || t === "team";
  });
  if (named >= 0) return named;
  for (let c = firstTopic - 1; c >= 0; c--) {
    const t = header[c].trim().toLowerCase();
    if (!t || t === "rank" || t === "sum" || t === "бланк") continue;
    return c;
  }
  return -1;
}

export function parseOchbSiGrid(grid: string[][], viewUrl: string): OchbSiBoard {
  const headerIdx = grid.findIndex((row) => row.some((value) => value.trim() === "Rank"));
  if (headerIdx < 0) throw new Error(READ_ERROR);
  const header = grid[headerIdx];
  const below = grid[headerIdx + 1] ?? [];
  const subIsLabels = below.some((value) => {
    const t = value.trim();
    return t === "Σ" || t === "10";
  });
  const sub = subIsLabels ? below : [];
  const spans = topicSpans(header, sub);
  if (spans.length === 0) throw new Error(READ_ERROR);

  const rankCol = header.findIndex((value) => value.trim() === "Rank");
  const sumCol = header.findIndex((value) => value.trim() === "Sum");
  const nameCol = teamColumn(header, spans[0].start);
  if (rankCol < 0 || nameCol < 0) throw new Error(READ_ERROR);

  const dataStart = headerIdx + (subIsLabels ? 2 : 1);
  const drafts: (OchbSiTeam & { order: number })[] = [];
  for (let r = dataStart; r < grid.length; r++) {
    const row = grid[r];
    const name = cell(row, nameCol);
    if (!name) continue;
    drafts.push({
      order: r,
      rank: cell(row, rankCol),
      name,
      sum: sumCol >= 0 ? cell(row, sumCol) : "",
      topics: spans.map((span) => {
        const labels = sub.slice(span.start, span.end).map((value) => value.trim());
        let sumOffset = labels.indexOf("Σ");
        if (sumOffset < 0) sumOffset = span.end - span.start - 1;
        const marks: OchbSiMark[] = [];
        for (let i = 0; i < span.end - span.start; i++) {
          if (i === sumOffset) continue;
          const label = labels[i] || String(marks.length + 1);
          marks.push({
            label,
            value: questionPoints(cell(row, span.start + i), label),
          });
        }
        return {
          name: span.name,
          sum: cell(row, span.start + sumOffset),
          marks,
        };
      }),
    });
  }

  drafts.sort((a, b) => {
    const ra = rankNumber(a.rank);
    const rb = rankNumber(b.rank);
    if (ra == null && rb == null) return a.order - b.order;
    if (ra == null) return 1;
    if (rb == null) return -1;
    if (ra !== rb) return ra - rb;
    return a.order - b.order;
  });

  return {
    viewUrl,
    rankHeader: header[rankCol].trim(),
    teamHeader: header[nameCol].trim(),
    sumHeader: sumCol >= 0 ? header[sumCol].trim() : "",
    topicNames: spans.map((span) => span.name),
    teams: drafts.map((team) => ({
      rank: team.rank,
      name: team.name,
      sum: team.sum,
      topics: team.topics,
    })),
  };
}

export async function loadOchbSi(): Promise<OchbSiBoard> {
  const parsed = sheet();
  const text = await fetchSheetCsv(parsed, { revalidate: OCHB_SI_REVALIDATE_SECONDS });
  return parseOchbSiGrid(parseCsv(text), parsed.viewUrl);
}

/**
 * Same board as {@link loadOchbSi} for the 60-second poll.
 * Omits `revalidate`, so this request uses `cache: "no-store"` and does not
 * read the page's 3-minute fetch cache. Other sheet fetches are unchanged.
 */
export async function loadOchbSiFresh(): Promise<OchbSiBoard> {
  const parsed = sheet();
  const text = await fetchSheetCsv(parsed);
  return parseOchbSiGrid(parseCsv(text), parsed.viewUrl);
}
