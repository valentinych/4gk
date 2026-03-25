/** Данные трансляции haza.online (таблица результатов ЧГК по турам). */

export interface HazaTour {
  n: number;
  q: number;
}

export interface HazaTeam {
  pos: number;
  name: string;
  city: string;
  answers: string;
  score: number;
  /** 0 — зачёт ЧСт (чемпионат страны / польский зачёт в трансляции), иначе обычно 50000 */
  group: number;
}

export interface HazaData {
  tours: HazaTour[];
  teams: HazaTeam[];
  lastQuestion: number;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseHazaResultsXml(xml: string): HazaData {
  const tours: HazaTour[] = [];
  const tourRe = /<tour\s+n="(\d+)"\s+q="(\d+)"\s*\/>/g;
  let tm: RegExpExecArray | null;
  while ((tm = tourRe.exec(xml)) !== null) {
    tours.push({ n: parseInt(tm[1], 10), q: parseInt(tm[2], 10) });
  }

  const rawTeams: HazaTeam[] = [];
  const teamRe =
    /<team\s+p="([^"]+)"\s+n="([^"]*?)"\s+q="([01]*)"\s+c="([^"]*?)"\s+s="(\d+)"\s+gr="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = teamRe.exec(xml)) !== null) {
    rawTeams.push({
      pos: parseFloat(m[1]),
      name: decodeXmlEntities(m[2]),
      answers: m[3],
      city: decodeXmlEntities(m[4]),
      score: parseInt(m[5], 10),
      group: parseInt(m[6], 10),
    });
  }

  const seen = new Set<string>();
  const teams: HazaTeam[] = [];
  for (const t of rawTeams) {
    const key = `${t.pos}\0${t.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    teams.push(t);
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

  return { tours, teams, lastQuestion };
}

export async function fetchHazaBroadcastXml(broadcastId: number): Promise<string> {
  const body = `id=${broadcastId}&s=0&b=1&vis_img=1&sec=60&last_id=0&k=variants_${broadcastId}&v=&tz=-1`;
  const res = await fetch("https://www.haza.online/get_bcast_results.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  return res.text();
}

export async function fetchHazaBroadcastData(broadcastId: number): Promise<HazaData> {
  const xml = await fetchHazaBroadcastXml(broadcastId);
  return parseHazaResultsXml(xml);
}
