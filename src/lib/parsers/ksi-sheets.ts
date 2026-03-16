const SHEET_ID = "1qFeswBW7vho7U8h9GvGGe8ZAXIqN4Tn0oZHeH5vzo4A";

export interface KsiTeam {
  pos: string;
  name: string;
  tours: (number | null)[];
  sum: number;
  total: number;
}

export interface KsiData {
  groupA: KsiTeam[];
  groupB: KsiTeam[];
}

export async function parseKsiSheets(): Promise<KsiData> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
  const text = await fetch(url).then((r) => r.text());
  const rows = parseCSV(text);

  const groupA: KsiTeam[] = [];
  const groupB: KsiTeam[] = [];

  let currentGroup: KsiTeam[] | null = null;
  let tourIndices: number[] = [];

  for (const row of rows) {
    const c0 = (row[0] ?? "").trim();
    const c1 = (row[1] ?? "").trim();

    if (c0 === "М" && c1 === "Команда") {
      currentGroup = groupA;
      tourIndices = findTourHeaderIndices(row);
      continue;
    }

    if (c1.includes("ГРУППА")) {
      currentGroup = groupB;
      tourIndices = findTourHeaderIndices(row);
      continue;
    }

    if (!currentGroup || !c0 || !c1) continue;
    if (!/^\d/.test(c0)) continue;

    const tours: (number | null)[] = [];
    for (const idx of tourIndices) {
      const v = parseNum(row[idx]);
      tours.push(isNaN(v) ? null : v);
    }

    const nonNullTours = tours.filter((t) => t !== null);
    if (nonNullTours.length === 0) continue;

    const lastTwo = row.slice(-2);
    const sum = parseNum(lastTwo[0]);
    const total = parseNum(lastTwo[1]);

    groupA === currentGroup || groupB === currentGroup;
    currentGroup.push({
      pos: c0,
      name: c1,
      tours,
      sum: isNaN(sum) ? 0 : sum,
      total: isNaN(total) ? 0 : total,
    });
  }

  trimEmptyTours(groupA);
  trimEmptyTours(groupB);

  return { groupA, groupB };
}

function trimEmptyTours(teams: KsiTeam[]) {
  if (teams.length === 0) return;
  const maxTours = Math.max(...teams.map((t) => t.tours.length));
  let lastActive = -1;
  for (let ti = 0; ti < maxTours; ti++) {
    const hasNonZero = teams.some((t) => {
      const v = t.tours[ti];
      return v !== null && v !== 0;
    });
    if (hasNonZero) lastActive = ti;
  }
  for (const team of teams) {
    team.tours = team.tours.slice(0, lastActive + 1);
  }
}

function findTourHeaderIndices(row: string[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < row.length; i++) {
    if (/^ТУР\s+\d+$/i.test((row[i] ?? "").trim())) {
      indices.push(i);
    }
  }
  return indices;
}

function parseNum(s: string | undefined): number {
  if (!s) return NaN;
  const cleaned = s.trim().replace(/,/g, "");
  if (cleaned === "" || cleaned === "-") return NaN;
  return Number(cleaned);
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
