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

/**
 * haza.online runs names through HTML encoding, so Latin letters arrive as
 * named entities (`&egrave;`). A leftover entity is escaped again in React and
 * shows up as the letters `&egrave;`. One pass: `&amp;egrave;` stays `&egrave;`.
 */
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  iexcl: "\u00a1",
  cent: "\u00a2",
  pound: "\u00a3",
  curren: "\u00a4",
  yen: "\u00a5",
  brvbar: "\u00a6",
  sect: "\u00a7",
  uml: "\u00a8",
  copy: "\u00a9",
  ordf: "\u00aa",
  laquo: "\u00ab",
  not: "\u00ac",
  shy: "\u00ad",
  reg: "\u00ae",
  macr: "\u00af",
  deg: "\u00b0",
  plusmn: "\u00b1",
  sup2: "\u00b2",
  sup3: "\u00b3",
  acute: "\u00b4",
  micro: "\u00b5",
  para: "\u00b6",
  middot: "\u00b7",
  cedil: "\u00b8",
  sup1: "\u00b9",
  ordm: "\u00ba",
  raquo: "\u00bb",
  frac14: "\u00bc",
  frac12: "\u00bd",
  frac34: "\u00be",
  iquest: "\u00bf",
  Agrave: "\u00c0",
  Aacute: "\u00c1",
  Acirc: "\u00c2",
  Atilde: "\u00c3",
  Auml: "\u00c4",
  Aring: "\u00c5",
  AElig: "\u00c6",
  Ccedil: "\u00c7",
  Egrave: "\u00c8",
  Eacute: "\u00c9",
  Ecirc: "\u00ca",
  Euml: "\u00cb",
  Igrave: "\u00cc",
  Iacute: "\u00cd",
  Icirc: "\u00ce",
  Iuml: "\u00cf",
  ETH: "\u00d0",
  Ntilde: "\u00d1",
  Ograve: "\u00d2",
  Oacute: "\u00d3",
  Ocirc: "\u00d4",
  Otilde: "\u00d5",
  Ouml: "\u00d6",
  times: "\u00d7",
  Oslash: "\u00d8",
  Ugrave: "\u00d9",
  Uacute: "\u00da",
  Ucirc: "\u00db",
  Uuml: "\u00dc",
  Yacute: "\u00dd",
  THORN: "\u00de",
  szlig: "\u00df",
  agrave: "\u00e0",
  aacute: "\u00e1",
  acirc: "\u00e2",
  atilde: "\u00e3",
  auml: "\u00e4",
  aring: "\u00e5",
  aelig: "\u00e6",
  ccedil: "\u00e7",
  egrave: "\u00e8",
  eacute: "\u00e9",
  ecirc: "\u00ea",
  euml: "\u00eb",
  igrave: "\u00ec",
  iacute: "\u00ed",
  icirc: "\u00ee",
  iuml: "\u00ef",
  eth: "\u00f0",
  ntilde: "\u00f1",
  ograve: "\u00f2",
  oacute: "\u00f3",
  ocirc: "\u00f4",
  otilde: "\u00f5",
  ouml: "\u00f6",
  divide: "\u00f7",
  oslash: "\u00f8",
  ugrave: "\u00f9",
  uacute: "\u00fa",
  ucirc: "\u00fb",
  uuml: "\u00fc",
  yacute: "\u00fd",
  thorn: "\u00fe",
  yuml: "\u00ff",
  OElig: "\u0152",
  oelig: "\u0153",
  Scaron: "\u0160",
  scaron: "\u0161",
  Yuml: "\u0178",
};

function decodeCodePoint(cp: number, raw: string): string {
  if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) return raw;
  if (cp >= 0xd800 && cp <= 0xdfff) return raw;
  return String.fromCodePoint(cp);
}

function decodeXmlEntities(s: string): string {
  return s.replace(
    /&(?:#x([0-9a-fA-F]+)|#(\d+)|([A-Za-z]+));/g,
    (raw, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
      if (hex != null) return decodeCodePoint(parseInt(hex, 16), raw);
      if (dec != null) return decodeCodePoint(parseInt(dec, 10), raw);
      if (name != null) return NAMED_HTML_ENTITIES[name] ?? raw;
      return raw;
    },
  );
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
    /<team\s+p="([^"]+)"\s+n="([^"]*?)"\s+q="([01]*)"\s+c="([^"]*?)"\s+s="(\d+)"\s+gr="(-?\d+)"/g;
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

async function fetchHazaResultsXml(id: number, broadcast: boolean): Promise<string> {
  const body = `id=${id}&s=0&b=${broadcast ? 1 : 0}`;
  const res = await fetch("https://www.haza.online/get_bcast_results.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  return res.text();
}

/** Игра на haza.online (/game/{id}). */
export async function fetchHazaGameData(gameId: number): Promise<HazaData> {
  const xml = await fetchHazaResultsXml(gameId, false);
  return parseHazaResultsXml(xml);
}
