import type { SheetTableData } from "@/lib/google-sheets";
import type { PocBout, PocCrossCell, PocRow } from "@/lib/parsers/poc-calculator";

export const ISI_LAST_TOUR_COUNT = 4;
export const ISI_LIVE_TOUR_NUMBER = 5;
export const ISI_TOUR5_NAME = `Тур ${ISI_LIVE_TOUR_NUMBER}`;

export type IsiLeagueTable = {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  viewUrl: string;
  error: string | null;
};

export type IsiFightPlayer = {
  name: string;
  score: number;
};

export type IsiFight = {
  room: string;
  started: boolean;
  players: IsiFightPlayer[];
};

export type IsiPack = {
  id: string;
  title: string;
  boutLabel: string;
  time: string;
  viewUrl: string;
  error: string | null;
  fights: IsiFight[];
};

export type IsiPocTour = {
  name: string;
  tables: [string, number][][];
};

export type IsiLiveData = {
  leagues: IsiLeagueTable[];
  packs: IsiPack[];
  poc: PocRow[];
  /** True once at least one Tour 5 fight has a non-zero score. */
  pocIncludesTour5: boolean;
  crossPlayers: string[];
  crossTable: Record<string, PocCrossCell>;
  /** Tour names of started Tour 5; typically `["Тур 5"]` once a fight has a non-zero score. */
  currentSeasonTourNames: string[];
  /** Rolling last 4 tours that count in POC and the H2H aggregate. */
  countedTourNames: string[];
};

export function sheetGrid(data: SheetTableData): string[][] {
  return [data.headers, ...data.rows];
}

export function parseNumericCell(value: string): number | null {
  const compact = value.trim().replace(/[\s\u00A0\u202F]/g, "").replace(",", ".");
  if (!compact) return null;
  if (!/^-?\d+(\.\d+)?$/.test(compact)) return null;
  const n = Number(compact);
  return Number.isFinite(n) ? n : null;
}

function normHeader(s: string): string {
  return s.trim().toLowerCase();
}

function isSumHeader(s: string): boolean {
  const t = normHeader(s);
  return t === "сумма" || t === "summa" || t === "sum";
}

function isPointsHeader(s: string): boolean {
  const t = normHeader(s);
  return t === "очки" || t === "points" || t === "баллы" || t === "pts";
}

function isPlaceHeader(s: string): boolean {
  const t = normHeader(s);
  return t === "№" || t === "#" || t === "место" || t === "place" || t === "rank";
}

function isSummaCell(s: string): boolean {
  return isSumHeader(s);
}

function colCountOf(headers: string[], rows: string[][]): number {
  return Math.max(headers.length, ...rows.map((r) => r.length), 0);
}

function padRow(row: string[], cols: number): string[] {
  const next = row.slice(0, cols);
  while (next.length < cols) next.push("");
  return next;
}

function colAllBlankOrZero(rows: string[][], col: number): boolean {
  return rows.every((r) => {
    const t = (r[col] ?? "").trim();
    if (!t) return true;
    const n = parseNumericCell(t);
    return n === 0;
  });
}

function colHasNonZero(rows: string[][], col: number): boolean {
  return rows.some((r) => {
    const n = parseNumericCell(r[col] ?? "");
    return n != null && n !== 0;
  });
}

function resolveMergedValueCol(col: number, rows: string[][], cols: number): number {
  if (!colAllBlankOrZero(rows, col)) return col;
  if (col + 1 < cols && colHasNonZero(rows, col + 1)) return col + 1;
  return col;
}

function pickSortCol(headers: string[], rows: string[][]): { col: number; kind: "sum" | "points" | "place" | "none" } {
  const cols = colCountOf(headers, rows);
  const pts = headers.findIndex(isPointsHeader);
  if (pts >= 0) return { col: resolveMergedValueCol(pts, rows, cols), kind: "points" };
  const sum = headers.findIndex(isSumHeader);
  if (sum >= 0) return { col: resolveMergedValueCol(sum, rows, cols), kind: "sum" };
  const place = headers.findIndex(isPlaceHeader);
  if (place >= 0) return { col: place, kind: "place" };
  return { col: -1, kind: "none" };
}

function sortRowsByCol(rows: string[][], col: number, dir: "desc" | "asc"): string[][] {
  return rows
    .map((row, i) => ({ row, i, n: parseNumericCell(row[col] ?? "") }))
    .sort((a, b) => {
      if (a.n == null && b.n == null) return a.i - b.i;
      if (a.n == null) return 1;
      if (b.n == null) return -1;
      const cmp = dir === "asc" ? a.n - b.n : b.n - a.n;
      return cmp !== 0 ? cmp : a.i - b.i;
    })
    .map((x) => x.row);
}

/** Same score → same place; next distinct score skips (1, 1, 3). */
function competitionPlaces(rows: string[][], col: number): (number | null)[] {
  const scored = rows
    .map((row, i) => ({ i, n: parseNumericCell(row[col] ?? "") }))
    .filter((x): x is { i: number; n: number } => x.n != null)
    .sort((a, b) => b.n - a.n || a.i - b.i);

  const places: (number | null)[] = rows.map(() => null);
  let lastN: number | null = null;
  let lastPlace = 0;
  scored.forEach((x, idx) => {
    const place = lastN != null && x.n === lastN ? lastPlace : idx + 1;
    places[x.i] = place;
    lastN = x.n;
    lastPlace = place;
  });
  return places;
}

function findHeaderRow(grid: string[][]): number {
  for (let i = 0; i < Math.min(3, grid.length); i++) {
    if (grid[i].some((c) => isSumHeader(c) || isPointsHeader(c) || isPlaceHeader(c))) return i;
  }
  return 0;
}

function dropColumns(
  headers: string[],
  rows: string[][],
  drop: Set<number>,
): { headers: string[]; rows: string[][] } {
  const keep: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (!drop.has(i)) keep.push(i);
  }
  return {
    headers: keep.map((i) => headers[i] ?? ""),
    rows: rows.map((row) => keep.map((i) => row[i] ?? "")),
  };
}

function fillHeaders(headers: string[], rows: string[][]): string[] {
  const cols = colCountOf(headers, rows);
  const h = padRow(headers, cols).map((c) => c.trim());

  let nameCol = -1;
  let best = 0;
  for (let c = 0; c < cols; c++) {
    const textCount = rows.filter((r) => {
      const v = (r[c] ?? "").trim();
      return v !== "" && parseNumericCell(v) == null;
    }).length;
    if (textCount > best) {
      best = textCount;
      nameCol = c;
    }
  }
  if (nameCol >= 0 && !h[nameCol]) h[nameCol] = "Игрок";

  const hasPoints = h.some(isPointsHeader);
  if (!hasPoints && nameCol !== 0) {
    const numeric = rows.filter((r) => parseNumericCell(r[0] ?? "") != null).length;
    if (!h[0] && numeric >= Math.ceil(rows.length / 2) && numeric > 0) {
      h[0] = "Баллы";
    }
  }

  for (let c = 0; c < cols; c++) {
    if (isSumHeader(h[c])) h[c] = "Сумма";
  }
  return h;
}

export function parseLeagueTable(
  data: SheetTableData,
  meta: { id: string; title: string },
): IsiLeagueTable {
  const grid = sheetGrid(data);
  if (!grid.length) {
    return { ...meta, headers: [], rows: [], viewUrl: data.viewUrl, error: null };
  }

  const headerIdx = findHeaderRow(grid);
  let headers = [...(grid[headerIdx] ?? [])];
  let rows = grid.slice(headerIdx + 1).filter((r) => r.some((c) => c.trim()));
  if (!rows.length) {
    return { ...meta, headers: [], rows: [], viewUrl: data.viewUrl, error: null };
  }

  const cols = colCountOf(headers, rows);
  headers = padRow(headers, cols);
  rows = rows.map((r) => padRow(r, cols));
  headers = fillHeaders(headers, rows);

  const sort = pickSortCol(headers, rows);
  if (sort.kind === "sum" || sort.kind === "points") {
    const labeled = headers.findIndex(sort.kind === "sum" ? isSumHeader : isPointsHeader);
    if (labeled >= 0 && labeled !== sort.col) {
      if (!headers[sort.col]) headers[sort.col] = sort.kind === "sum" ? "Сумма" : headers[labeled];
    }
  }

  const drop = new Set<number>();
  for (let c = 0; c < headers.length; c++) {
    const allEmpty = rows.every((r) => !(r[c] ?? "").trim()) && !headers[c];
    if (allEmpty) drop.add(c);
  }
  if (sort.kind === "sum" || sort.kind === "points") {
    const labeled = headers.findIndex(sort.kind === "sum" ? isSumHeader : isPointsHeader);
    if (labeled >= 0 && labeled !== sort.col && colAllBlankOrZero(rows, labeled)) {
      drop.add(labeled);
    }
  }

  const dropped = dropColumns(headers, rows, drop);
  headers = dropped.headers;
  rows = dropped.rows;

  const sortAfter = pickSortCol(headers, rows);
  if (sortAfter.kind === "sum" || sortAfter.kind === "points") {
    rows = sortRowsByCol(rows, sortAfter.col, "desc");
    const places = competitionPlaces(rows, sortAfter.col);
    const placeCol = headers.findIndex(isPlaceHeader);
    if (placeCol >= 0) {
      rows = rows.map((row, i) => {
        const next = [...row];
        next[placeCol] = places[i] == null ? "" : String(places[i]);
        return next;
      });
    } else {
      headers = ["№", ...headers];
      rows = rows.map((row, i) => [
        places[i] == null ? "" : String(places[i]),
        ...row,
      ]);
    }
  }

  return { ...meta, headers, rows, viewUrl: data.viewUrl, error: null };
}

function roomName(top: string[], from: number, to: number): string {
  for (let c = from; c < to; c++) {
    const t = (top[c] ?? "").trim();
    if (!t) continue;
    if (/^\d{1,2}:\d{2}$/.test(t)) continue;
    if (/^\d+$/.test(t)) continue;
    return t.replace(/\s*\(\d+\)\s*$/, "");
  }
  return "";
}

function packTime(top: string[]): string {
  return (top.find((c) => /^\d{1,2}:\d{2}$/.test(c.trim())) ?? "").trim();
}

function packBoutLabel(row: string[]): string {
  for (const cell of row) {
    const t = cell.trim();
    if (!t) continue;
    if (/^ведущий/i.test(t)) continue;
    if (/^цвета$/i.test(t)) continue;
    return t;
  }
  return "";
}

export function parsePackTab(
  data: SheetTableData,
  meta: { id: string; title: string },
): IsiPack {
  const grid = sheetGrid(data);
  const empty: IsiPack = {
    ...meta,
    boutLabel: "",
    time: "",
    viewUrl: data.viewUrl,
    error: null,
    fights: [],
  };
  if (!grid.length) return empty;

  const sumRowIdx = grid.findIndex((r) => r.some(isSummaCell));
  if (sumRowIdx < 1) return { ...empty, time: packTime(grid[0] ?? []) };

  const sumRow = grid[sumRowIdx] ?? [];
  const playerRow = grid[sumRowIdx - 1] ?? [];
  const top = grid[0] ?? [];
  const boutRow = grid[1] ?? [];
  const summaCols: number[] = [];
  sumRow.forEach((c, i) => {
    if (isSummaCell(c)) summaCols.push(i);
  });

  const fights: IsiFight[] = [];
  for (let fi = 0; fi < summaCols.length; fi++) {
    const start = summaCols[fi];
    const end = summaCols[fi + 1] ?? Math.max(sumRow.length, playerRow.length);
    const players: IsiFightPlayer[] = [];
    for (let i = start + 1; i < end; i++) {
      const name = (playerRow[i] ?? "").trim();
      if (!name || /^ведущий/i.test(name)) continue;
      players.push({
        name,
        score: parseNumericCell(sumRow[i] ?? "") ?? 0,
      });
    }
    if (!players.length) continue;
    fights.push({
      room: roomName(top, start, end),
      started: players.some((p) => p.score !== 0),
      players,
    });
  }

  return {
    ...meta,
    boutLabel: packBoutLabel(boutRow),
    time: packTime(top),
    viewUrl: data.viewUrl,
    error: null,
    fights,
  };
}

/** Same grouping as 2025/26 archive / poc-calculator parseTabCsv (blank line = new fight). */
export function parseMatchTourGroups(csv: string): [string, number][][] {
  const groups: [string, number][][] = [];
  let current: [string, number][] = [];

  for (const line of csv.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const cells = line.split(",");
    const name = (cells[0] ?? "").trim().replace(/^"|"$/g, "");
    const scoreRaw = (cells[1] ?? "").trim().replace(/^"|"$/g, "");

    if (!name) {
      if (current.length) {
        groups.push(current);
        current = [];
      }
      continue;
    }
    const score = parseInt(scoreRaw, 10);
    if (isNaN(score)) continue;
    current.push([name, score]);
  }
  if (current.length) groups.push(current);
  return groups;
}

/** 1А, 2А, … then 1Б, 2Б, … — pack labels are Tour 5 slots, not tour names. */
function packFightOrderKey(pack: IsiPack): [number, number] {
  const m = /^(\d+)\s*([A-Za-zА-Яа-яЁё])/.exec((pack.boutLabel || pack.title).trim());
  if (!m) return [9, 999];
  const ch = m[2].toUpperCase();
  const league = ch === "А" || ch === "A" ? 0 : ch === "Б" || ch === "B" ? 1 : 2;
  return [league, Number(m[1])];
}

/**
 * One Tour 5 list: 1А→6А then 1Б→6Б, rooms in sheet order. Index 1…n
 * (empty slots keep numbering). Unstarted fights are not games.
 */
export function startedPocTables(packs: IsiPack[]): IsiPocTour[] {
  const ordered = [...packs].sort((a, b) => {
    const [la, na] = packFightOrderKey(a);
    const [lb, nb] = packFightOrderKey(b);
    return la - lb || na - nb;
  });
  const tables: [string, number][][] = [];
  let anyStarted = false;
  for (const pack of ordered) {
    for (const fight of pack.fights) {
      if (fight.started) {
        anyStarted = true;
        tables.push(fight.players.map((p) => [p.name, p.score] as [string, number]));
      } else {
        tables.push([]);
      }
    }
  }
  if (!anyStarted) return [];
  return [{ name: ISI_TOUR5_NAME, tables }];
}

export function tourNumber(name: string): number | null {
  const m = /^Тур\s+(\d+)$/i.exec(name.trim());
  return m ? Number(m[1]) : null;
}

/** Last 4: live-3 … live; live tour omitted until a fight has a non-zero score. */
export function isInLastFourTours(name: string, liveStarted: boolean): boolean {
  const n = tourNumber(name);
  if (n == null) return false;
  const oldest = ISI_LIVE_TOUR_NUMBER - (ISI_LAST_TOUR_COUNT - 1);
  if (n < oldest || n > ISI_LIVE_TOUR_NUMBER) return false;
  if (n === ISI_LIVE_TOUR_NUMBER && !liveStarted) return false;
  return true;
}

export function splitLastFourTours(
  archive: IsiPocTour[],
  packs: IsiPack[],
): { counted: IsiPocTour[]; older: IsiPocTour[] } {
  const live = startedPocTables(packs);
  const liveStarted = live.length > 0;
  const older: IsiPocTour[] = [];
  const counted: IsiPocTour[] = [];
  for (const tour of archive) {
    if (!tour.tables.length) continue;
    if (isInLastFourTours(tour.name, liveStarted)) counted.push(tour);
    else older.push(tour);
  }
  counted.push(...live);
  return { counted, older };
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|||${b}` : `${b}|||${a}`;
}

export function pairwiseBoutsFromTour(tour: IsiPocTour): { key: string; bout: PocBout }[] {
  const out: { key: string; bout: PocBout }[] = [];
  for (let gi = 0; gi < tour.tables.length; gi++) {
    const table = tour.tables[gi];
    for (let i = 0; i < table.length; i++) {
      for (let j = i + 1; j < table.length; j++) {
        const a = table[i][0];
        const b = table[j][0];
        const sA = table[i][1];
        const sB = table[j][1];
        const key = pairKey(a, b);
        const aFirst = key.startsWith(`${a}|||`);
        out.push({
          key,
          bout: {
            tourName: tour.name,
            boutIdx: gi + 1,
            scoreA: aFirst ? sA : sB,
            scoreB: aFirst ? sB : sA,
          },
        });
      }
    }
  }
  return out;
}

/** Prepend older-tour bouts without changing counted wins / total. */
export function prependCrossBouts(
  crossTable: Record<string, PocCrossCell>,
  extra: { key: string; bout: PocBout }[],
): Record<string, PocCrossCell> {
  if (!extra.length) return crossTable;
  const next: Record<string, PocCrossCell> = { ...crossTable };
  const grouped = new Map<string, PocBout[]>();
  for (const { key, bout } of extra) {
    const list = grouped.get(key);
    if (list) list.push(bout);
    else grouped.set(key, [bout]);
  }
  for (const [key, bouts] of grouped) {
    const cell = next[key];
    if (cell) {
      next[key] = { ...cell, bouts: [...bouts, ...cell.bouts] };
    } else {
      next[key] = { winsA: 0, winsB: 0, draws: 0, total: 0, bouts };
    }
  }
  return next;
}
