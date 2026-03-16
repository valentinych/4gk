import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GID_MAP: Record<string, string> = {
  "1-16": "0",
  "17-32": "12972537",
  "33-48": "1710684869",
};

interface GroupTeam {
  pos: string;
  name: string;
  played: number;
  win: number;
  draw: number;
  lost: number;
  zero: number;
  gf: number;
  ga: number;
  diff: number;
  points: number;
}

interface Group {
  time: string;
  letter: string;
  letterName: string;
  venue: string;
  type: "group" | "finals";
  teams: GroupTeam[];
}

interface FinalMatch {
  round: string;
  venue: string;
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
}

interface BrainData {
  groups: Group[];
  finals: FinalMatch[];
}

function parseCsvLine(line: string): string[] {
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

export async function GET(req: NextRequest) {
  const tier = req.nextUrl.searchParams.get("tier") ?? "1-16";
  const gid = GID_MAP[tier];
  if (!gid) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/1gO2dKghCx671WqenavRioA8wBRLCd_i0Cby6j8qCo6M/export?format=csv&gid=${gid}`;
    const text = await fetch(url, { cache: "no-store" }).then((r) => r.text());
    const lines = text.split("\n").map(parseCsvLine);

    const groups: Group[] = [];
    const finals: FinalMatch[] = [];
    let i = 0;
    let inFinals = false;

    while (i < lines.length) {
      const row = lines[i];

      if (row.every((c) => !c)) { i++; continue; }

      if (row[1] === "Группа") {
        inFinals = false;
        const time = row[0];
        const letter = row[5] ?? row[3] ?? "";
        const letterName = row[8] ?? "";
        i++;
        if (i >= lines.length) break;
        const headerRow = lines[i];
        const venue = (headerRow[0] || headerRow[1] || "").trim();
        i++;

        const teams: GroupTeam[] = [];
        while (i < lines.length) {
          const tr = lines[i];
          if (tr.every((c) => !c)) { i++; break; }
          if (!/^\d+$/.test(tr[0])) break;
          teams.push({
            pos: tr[0],
            name: tr[1] ?? "",
            played: parseInt(tr[2]) || 0,
            win: parseInt(tr[3]) || 0,
            draw: parseInt(tr[4]) || 0,
            lost: parseInt(tr[5]) || 0,
            zero: parseInt(tr[6]) || 0,
            gf: parseInt(tr[7]) || 0,
            ga: parseInt(tr[8]) || 0,
            diff: parseInt(tr[9]) || 0,
            points: parseInt(tr[10]) || 0,
          });
          i++;
        }
        groups.push({ time, letter: letter.trim(), letterName: letterName.trim(), venue, type: "group", teams });
      } else if (row[1] === "Финалы") {
        inFinals = true;
        i++;
      } else if (inFinals || row[1]?.includes("Площадка") || row[0]?.includes("Площадка")) {
        const venue = (row[0] || row[1] || "").trim();
        i++;
        if (i >= lines.length) break;
        const r1 = lines[i];
        if (!r1 || r1.every((c) => !c)) continue;
        const round = r1[0] ?? "";
        const teamA = r1[1] ?? "";
        const scoreA = parseInt(r1[2]) || 0;
        i++;
        if (i >= lines.length) break;
        const r2 = lines[i];
        const teamB = r2[1] ?? r2[0] ?? "";
        const scoreB = parseInt(r2[2] ?? r2[1] ?? "0") || 0;
        finals.push({ round, venue, teamA, scoreA, teamB, scoreB });
        i++;
      } else {
        i++;
      }
    }

    const data: BrainData = { groups, finals };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
