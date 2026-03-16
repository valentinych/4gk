import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface StormTeam {
  name: string;
  isPL: boolean;
  sum: number;
  tours: (number | null)[];
}

interface StormData {
  tourCount: number;
  teams: StormTeam[];
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

export async function GET() {
  try {
    const url =
      "https://docs.google.com/spreadsheets/d/1gFv3XVVB2Fvd-E688J5aOg7Wk1kAuqlh619KqS2GQk8/export?format=csv&gid=0";
    const text = await fetch(url, { cache: "no-store" }).then((r) => r.text());
    const lines = text.split("\n").map(parseCsvLine);

    const header = lines[0] ?? [];
    const tourCount = Math.max(0, header.length - 3);

    const teams: StormTeam[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i];
      const name = (cells[0] ?? "").trim();
      if (!name) continue;
      const isPL = (cells[1] ?? "").trim() === "PL";
      const sum = parseInt(cells[2] ?? "0") || 0;
      const tours: (number | null)[] = [];
      for (let t = 0; t < tourCount; t++) {
        const v = cells[3 + t]?.trim();
        tours.push(v && v !== "" ? parseInt(v) || 0 : null);
      }
      teams.push({ name, isPL, sum, tours });
    }

    teams.sort((a, b) => b.sum - a.sum || a.name.localeCompare(b.name, "ru"));

    const data: StormData = { tourCount, teams };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
