import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface HazaTour {
  n: number;
  q: number;
}

interface HazaTeam {
  pos: number;
  name: string;
  city: string;
  answers: string;
  score: number;
  group: number;
}

interface HazaData {
  tours: HazaTour[];
  teams: HazaTeam[];
  lastQuestion: number;
}

export async function GET() {
  try {
    const body = "id=641&s=0&b=1&vis_img=1&sec=60&last_id=0&k=variants_641&v=&tz=-1";
    const res = await fetch("https://www.haza.online/get_bcast_results.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    const xml = await res.text();

    const tours: HazaTour[] = [];
    const tourRe = /<tour\s+n="(\d+)"\s+q="(\d+)"\s*\/>/g;
    let tm;
    while ((tm = tourRe.exec(xml)) !== null) {
      tours.push({ n: parseInt(tm[1]), q: parseInt(tm[2]) });
    }

    const teams: HazaTeam[] = [];
    const teamRe = /<team\s+p="(\d+)"\s+n="([^"]*?)"\s+q="([01]*)"\s+c="([^"]*?)"\s+s="(\d+)"\s+gr="(\d+)"/g;
    let m;
    while ((m = teamRe.exec(xml)) !== null) {
      teams.push({
        pos: parseInt(m[1]),
        name: decodeXmlEntities(m[2]),
        answers: m[3],
        city: decodeXmlEntities(m[4]),
        score: parseInt(m[5]),
        group: parseInt(m[6]),
      });
    }

    let lastQuestion = 0;
    for (const t of teams) {
      for (let i = t.answers.length - 1; i >= 0; i--) {
        if (t.answers[i] === "1") {
          lastQuestion = Math.max(lastQuestion, i + 1);
          break;
        }
      }
    }

    const data: HazaData = { tours, teams, lastQuestion };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
