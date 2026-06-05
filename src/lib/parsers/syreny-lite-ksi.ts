import { SYRENY_LITE_KSI, normalizeSyrenyLiteName } from "@/lib/syreny-lite";

export type KsiQuestionCost = (typeof SYRENY_LITE_KSI.questionCosts)[number];

export interface SyrenyLiteKsiQuestion {
  cost: KsiQuestionCost;
  /** 1 = plus, -1 = minus, null = not played */
  value: 1 | -1 | null;
}

export interface SyrenyLiteKsiTopic {
  number: number;
  sum: number;
  questions: SyrenyLiteKsiQuestion[];
}

export interface SyrenyLiteKsiTeam {
  name: string;
  total: number;
  day1: number;
  day2: number;
  topics: SyrenyLiteKsiTopic[];
  outOfCompetition: boolean;
}

export interface SyrenyLiteKsiData {
  teams: SyrenyLiteKsiTeam[];
  source: string;
}

const NAME_COL = 3;
const TOPIC_START_COL = 4;
const COLS_PER_TOPIC = 6;

export async function parseSyrenyLiteKsi(
  outOfCompetitionNames: Set<string>,
): Promise<SyrenyLiteKsiData> {
  const url = `https://docs.google.com/spreadsheets/d/${SYRENY_LITE_KSI.sheetId}/export?format=csv&gid=${SYRENY_LITE_KSI.gid}`;
  const text = await fetch(url, { next: { revalidate: 60 } }).then((r) => {
    if (!r.ok) throw new Error(`Sheet fetch failed: ${r.status}`);
    return r.text();
  });

  const rows = parseCSV(text);
  const teams: SyrenyLiteKsiTeam[] = [];

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri];
    const name = (row[NAME_COL] ?? "").trim();
    if (!name) continue;

    const topics: SyrenyLiteKsiTopic[] = [];
    for (let ti = 0; ti < SYRENY_LITE_KSI.topicCount; ti++) {
      const base = TOPIC_START_COL + ti * COLS_PER_TOPIC;
      const questions: SyrenyLiteKsiQuestion[] = SYRENY_LITE_KSI.questionCosts.map(
        (cost, qi) => ({
          cost,
          value: parseQuestionCell(row[base + qi]),
        }),
      );
      topics.push({
        number: ti + 1,
        sum: parseNum(row[base + 5]) ?? 0,
        questions,
      });
    }

    teams.push({
      name,
      total: parseNum(row[0]) ?? 0,
      day1: parseNum(row[1]) ?? 0,
      day2: parseNum(row[2]) ?? 0,
      topics,
      outOfCompetition: outOfCompetitionNames.has(normalizeSyrenyLiteName(name)),
    });
  }

  const main = teams
    .filter((t) => !t.outOfCompetition)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ru"));
  const out = teams
    .filter((t) => t.outOfCompetition)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ru"));

  return {
    teams: [...main, ...out],
    source: SYRENY_LITE_KSI.source,
  };
}

function parseQuestionCell(raw: string | undefined): 1 | -1 | null {
  const n = parseNum(raw);
  if (n === 1) return 1;
  if (n === -1) return -1;
  return null;
}

function parseNum(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.trim().replace(/,/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row: string[] = [];
    while (i < len) {
      if (text[i] === '"') {
        i++;
        let cell = "";
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              cell += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            cell += text[i];
            i++;
          }
        }
        row.push(cell);
        if (i < len && text[i] === ",") i++;
        else if (i < len && (text[i] === "\n" || text[i] === "\r")) {
          if (text[i] === "\r" && i + 1 < len && text[i + 1] === "\n") i += 2;
          else i++;
          break;
        }
      } else {
        let cell = "";
        while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          cell += text[i];
          i++;
        }
        row.push(cell);
        if (i < len && text[i] === ",") i++;
        else {
          if (text[i] === "\r" && i + 1 < len && text[i + 1] === "\n") i += 2;
          else if (i < len) i++;
          break;
        }
      }
    }
    rows.push(row);
  }

  return rows;
}
