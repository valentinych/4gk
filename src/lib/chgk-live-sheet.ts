/** Live CHGK tablo from a Pražma-style Google Sheet (one tab per tour). */

import type { PraguePayload, PragueTeamRow } from "./prague-stats";

export interface ChgkLiveTourTab {
  name: string;
  gid: string;
}

export interface ChgkLiveSheetConfig {
  sheetId: string;
  tours: ChgkLiveTourTab[];
  /** Subtract N questions from a 0-based tour index (Pražma tour 6). */
  questionTrimByTourIndex?: Record<number, number>;
  defaultQuestionsPerTour?: number;
  userAgent?: string;
}

export type ChgkLivePayload = PraguePayload;

const MAX_QUESTIONS_PER_TOUR = 200;
const HEADER_ROW_IDX = 1;
const MARK_ROW_IDX = 2;
const TEAM_DATA_START_ROW = 3;
const QUESTIONS_START_COL = 4;

function detectQuestionCount(
  rows: string[][],
  defaultQuestionsPerTour: number,
): number {
  const headerRow = rows[HEADER_ROW_IDX] || [];
  let last = -1;
  for (
    let c = QUESTIONS_START_COL;
    c < Math.min(headerRow.length, QUESTIONS_START_COL + MAX_QUESTIONS_PER_TOUR);
    c++
  ) {
    const v = (headerRow[c] || "").trim();
    if (/^\d+$/.test(v)) last = c;
  }
  if (last >= QUESTIONS_START_COL) return last - QUESTIONS_START_COL + 1;
  return defaultQuestionsPerTour;
}

export function parseChgkLiveCsv(text: string): string[][] {
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

export async function fetchChgkLiveTourCsv(
  config: ChgkLiveSheetConfig,
  gid: string,
): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${config.sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: { "User-Agent": config.userAgent ?? "4gk-chgk-live/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch gid=${gid}: ${res.status}`);
  }
  const text = await res.text();
  return parseChgkLiveCsv(text);
}

interface CollectedTeam {
  team: string;
  city: string;
  number: string;
  numberInt: number | null;
}

function collectTeams(rowsByTour: string[][][]): CollectedTeam[] {
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

function teamKeyOf(t: CollectedTeam): string {
  return t.numberInt !== null ? `n:${t.numberInt}` : `s:${t.team}|${t.city}`;
}

export function buildChgkLivePayload(
  config: ChgkLiveSheetConfig,
  rowsByTour: string[][][],
): ChgkLivePayload {
  const defaultQuestionsPerTour = config.defaultQuestionsPerTour ?? 36;
  const allTeams = collectTeams(rowsByTour);
  const questionCounts = rowsByTour.map((rows) =>
    detectQuestionCount(rows, defaultQuestionsPerTour),
  );
  const trim = config.questionTrimByTourIndex;
  if (trim) {
    for (const [idxStr, n] of Object.entries(trim)) {
      const idx = Number(idxStr);
      if (!Number.isFinite(idx) || questionCounts[idx] == null) continue;
      questionCounts[idx] = Math.max(1, questionCounts[idx] - n);
    }
  }

  const results = new Map<string, PragueTeamRow>();
  for (const t of allTeams) {
    results.set(teamKeyOf(t), {
      team: t.team,
      city: t.city,
      number: t.number,
      total: 0,
      place: "",
      tours: config.tours.map((tour, idx) => ({
        name: tour.name,
        total: 0,
        marks: Array(questionCounts[idx]).fill(null),
      })),
    });
  }

  for (let tourIdx = 0; tourIdx < config.tours.length; tourIdx++) {
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
    tours: config.tours.map((t, i) => ({
      name: t.name,
      questionCount: questionCounts[i],
    })),
    teams,
  };
}

export async function loadChgkLiveSheet(
  config: ChgkLiveSheetConfig,
): Promise<ChgkLivePayload> {
  const rowsByTour = await Promise.all(
    config.tours.map((t) => fetchChgkLiveTourCsv(config, t.gid)),
  );
  return buildChgkLivePayload(config, rowsByTour);
}
