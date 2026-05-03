import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHEET_ID = "16nsdiqD9cd4Uw-XLH1TTrAhmG0EstAHvRCL_bVml0fc";

const TOURS: Array<{ name: string; gid: string }> = [
  { name: "Тур 1", gid: "0" },
  { name: "Тур 2", gid: "277312779" },
  { name: "Тур 3", gid: "1473758408" },
  { name: "Тур 4", gid: "2035071153" },
  { name: "Тур 5", gid: "282065552" },
  { name: "Тур 6", gid: "689794601" },
];

/** Последний учитываемый глобальный номер вопроса — 235 (без тура 7 и двух лишних колонок в туре 6). */
const TOUR6_QUESTION_TRIM = 2;

const DEFAULT_QUESTIONS_PER_TOUR = 36;
const MAX_QUESTIONS_PER_TOUR = 200;
// Sheet layout (0-indexed in parsed CSV):
//   row 0: header (Команда, N, Город, номер скв, 1..N)
//   row 1: secondary header (номер тур, 1..N)
//   row 2: jury per-question mode mark (+ or −) — "row 3" in the sheet UI
//   rows 3..N: team list (A=team, B=N, C=city) AND jury input area:
//              in question columns the cells contain team numbers (N)
//              that match the row-2 mode for that question.
const HEADER_ROW_IDX = 1;
const MARK_ROW_IDX = 2;
const TEAM_DATA_START_ROW = 3;
const QUESTIONS_START_COL = 4;

function detectQuestionCount(rows: string[][]): number {
  // Use row 1 (secondary header with question numbers) to determine length.
  const headerRow = rows[HEADER_ROW_IDX] || [];
  let last = -1;
  for (let c = QUESTIONS_START_COL; c < Math.min(headerRow.length, QUESTIONS_START_COL + MAX_QUESTIONS_PER_TOUR); c++) {
    const v = (headerRow[c] || "").trim();
    if (/^\d+$/.test(v)) last = c;
  }
  if (last >= QUESTIONS_START_COL) return last - QUESTIONS_START_COL + 1;
  return DEFAULT_QUESTIONS_PER_TOUR;
}

type CacheEntry = { ts: number; payload: PraguePayload };
let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 25_000;

interface TourResult {
  name: string;
  total: number;
  marks: (boolean | null)[];
}

interface TeamRow {
  team: string;
  city: string;
  number: string;
  total: number;
  place: string;
  tours: TourResult[];
}

interface PraguePayload {
  updatedAt: string;
  tours: { name: string; questionCount: number }[];
  teams: TeamRow[];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
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
    } else if (c === "\r") {
      // ignore; handled by \n
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

type QuestionMode = "plus" | "minus" | "ungraded";

function classifyMark(value: string | undefined): QuestionMode {
  const v = (value || "").trim();
  if (!v) return "ungraded";
  if (v === "+" || v === "✓") return "plus";
  if (v === "-" || v === "−" || v === "–" || v === "✗") return "minus";
  return "ungraded";
}

function parseTeamNumbers(value: string | undefined): number[] {
  if (!value) return [];
  const matches = value.match(/\d+/g);
  if (!matches) return [];
  return matches.map((m) => parseInt(m, 10)).filter((n) => Number.isFinite(n));
}

async function fetchTour(gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: { "User-Agent": "4gk-prague/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch gid=${gid}: ${res.status}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

interface CollectedTeam {
  team: string;
  city: string;
  number: string;
  numberInt: number | null;
}

function collectTeams(rowsByTour: string[][][]): CollectedTeam[] {
  // Union team list across all tours, keyed by team N (preferred) or name+city.
  const byKey = new Map<string, CollectedTeam>();
  for (const rows of rowsByTour) {
    for (let r = TEAM_DATA_START_ROW; r < rows.length; r++) {
      const row = rows[r];
      const teamName = (row[0] || "").trim();
      if (!teamName) continue;
      const number = (row[1] || "").trim();
      const city = (row[2] || "").trim();
      const numberInt = number && /^\d+$/.test(number) ? parseInt(number, 10) : null;
      const key = numberInt !== null ? `n:${numberInt}` : `s:${teamName}|${city}`;
      if (!byKey.has(key)) {
        byKey.set(key, { team: teamName, city, number, numberInt });
      }
    }
  }
  return Array.from(byKey.values());
}

function buildPayload(rowsByTour: string[][][]): PraguePayload {
  const allTeams = collectTeams(rowsByTour);
  const teamByNumber = new Map<number, CollectedTeam>();
  for (const t of allTeams) {
    if (t.numberInt !== null) teamByNumber.set(t.numberInt, t);
  }

  const questionCounts = rowsByTour.map((rows) => detectQuestionCount(rows));
  const tour6Idx = TOURS.length - 1;
  if (tour6Idx >= 0 && questionCounts[tour6Idx] != null) {
    questionCounts[tour6Idx] = Math.max(
      1,
      questionCounts[tour6Idx] - TOUR6_QUESTION_TRIM,
    );
  }

  // teamKey -> tourIdx -> marks[]
  const results = new Map<string, TeamRow>();
  function teamKeyOf(t: CollectedTeam): string {
    return t.numberInt !== null ? `n:${t.numberInt}` : `s:${t.team}|${t.city}`;
  }
  for (const t of allTeams) {
    results.set(teamKeyOf(t), {
      team: t.team,
      city: t.city,
      number: t.number,
      total: 0,
      place: "",
      tours: TOURS.map((tour, idx) => ({
        name: tour.name,
        total: 0,
        marks: Array(questionCounts[idx]).fill(null),
      })),
    });
  }

  for (let tourIdx = 0; tourIdx < TOURS.length; tourIdx++) {
    const rows = rowsByTour[tourIdx];
    const markRow = rows[MARK_ROW_IDX] || [];
    const qCount = questionCounts[tourIdx];

    for (let q = 0; q < qCount; q++) {
      const col = QUESTIONS_START_COL + q;
      const mode = classifyMark(markRow[col]);
      if (mode === "ungraded") continue;

      const listed = new Set<number>();
      for (let r = TEAM_DATA_START_ROW; r < rows.length; r++) {
        const cell = rows[r][col];
        for (const n of parseTeamNumbers(cell)) listed.add(n);
      }

      for (const t of allTeams) {
        if (t.numberInt === null) continue;
        const isListed = listed.has(t.numberInt);
        const took = mode === "plus" ? isListed : !isListed;
        const entry = results.get(teamKeyOf(t));
        if (!entry) continue;
        entry.tours[tourIdx].marks[q] = took;
        if (took) entry.tours[tourIdx].total += 1;
      }
    }
  }

  const teams = Array.from(results.values()).map((t) => ({
    ...t,
    total: t.tours.reduce((sum, tr) => sum + tr.total, 0),
  }));

  teams.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.team.localeCompare(b.team, "ru");
  });

  // Compute shared places (e.g. "1-5" for ties).
  for (let i = 0; i < teams.length; ) {
    let j = i + 1;
    while (j < teams.length && teams[j].total === teams[i].total) j++;
    const start = i + 1;
    const end = j;
    const label = end > start ? `${start}-${end}` : `${start}`;
    for (let k = i; k < j; k++) teams[k].place = label;
    i = j;
  }

  return {
    updatedAt: new Date().toISOString(),
    tours: TOURS.map((t, i) => ({ name: t.name, questionCount: questionCounts[i] })),
    teams,
  };
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  }

  try {
    const rowsByTour = await Promise.all(TOURS.map((t) => fetchTour(t.gid)));
    const payload = buildPayload(rowsByTour);
    cache = { ts: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  } catch (err) {
    if (cache) {
      return NextResponse.json(cache.payload, {
        headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=30" },
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 },
    );
  }
}
