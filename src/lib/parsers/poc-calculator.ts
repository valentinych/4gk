export interface PocBout {
  tourName: string;
  boutIdx: number;
  scoreA: number;
  scoreB: number;
}

export interface PocCrossCell {
  winsA: number;
  winsB: number;
  draws: number;
  total: number;
  bouts: PocBout[];
}

export interface PocRow {
  pos: number;
  name: string;
  poc: number;
  sos: number;
  w: number;
  d: number;
  l: number;
  g: number;
}

export interface PocResult {
  poc: PocRow[];
  crossPlayers: string[];
  /** key = "pA|||pB" where pA is whoever comes first in pocOrder */
  crossTable: Record<string, PocCrossCell>;
}

interface Tour {
  name: string;
  tables: [string, number][][];
}

interface RawGame {
  a: string;
  b: string;
  sA: number;
  sB: number;
  tourName: string;
  boutIdx: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Stable pair key (alphabetical, locale-independent) */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|||${b}` : `${b}|||${a}`;
}

export function extractSheetId(input: string): string | null {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

// ─── Fetching ─────────────────────────────────────────────────────────────────

async function discoverTabs(
  sheetId: string,
): Promise<{ name: string; gid: string }[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
  const html = await fetch(url, { cache: "no-store" }).then((r) => r.text());
  const tabs: { name: string; gid: string }[] = [];
  const re = /name:\s*"([^"]*)".*?gid:\s*"(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    tabs.push({ name: m[1].trim(), gid: m[2] });
  }
  tabs.sort((a, b) => a.name.localeCompare(b.name));
  return tabs;
}

async function parseTabCsv(
  sheetId: string,
  gid: string,
): Promise<[string, number][][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const text = await fetch(url, { cache: "no-store" }).then((r) => r.text());
  const groups: [string, number][][] = [];
  let current: [string, number][] = [];

  for (const line of text.split("\n")) {
    const cells = line.split(",");
    const name = (cells[0] ?? "").trim().replace(/^"|"$/g, "");
    const scoreRaw = (cells[1] ?? "").trim().replace(/^"|"$/g, "");

    if (!name) {
      if (current.length) { groups.push(current); current = []; }
      continue;
    }
    const score = parseInt(scoreRaw, 10);
    if (isNaN(score)) continue;
    current.push([name, score]);
  }
  if (current.length) groups.push(current);
  return groups;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function computePoc(sheetId: string): Promise<PocResult> {
  const tabs = await discoverTabs(sheetId);
  if (!tabs.length) return { poc: [], crossPlayers: [], crossTable: {} };

  // Fetch all tabs in parallel
  const tabData = await Promise.all(
    tabs.map(async (tab) => ({
      name: tab.name,
      tables: await parseTabCsv(sheetId, tab.gid),
    })),
  );
  const tours: Tour[] = tabData.filter((t) => t.tables.length > 0);
  return computeFromTours(tours);
}

// ─── Pure computation ─────────────────────────────────────────────────────────

export function computeFromTours(tours: Tour[]): PocResult {
  const playerSet = new Set<string>();
  const allGames: RawGame[] = [];

  for (const tour of tours) {
    for (let gi = 0; gi < tour.tables.length; gi++) {
      const table = tour.tables[gi];
      for (const [name] of table) playerSet.add(name);
      for (let i = 0; i < table.length; i++) {
        for (let j = i + 1; j < table.length; j++) {
          allGames.push({
            a: table[i][0], b: table[j][0],
            sA: table[i][1], sB: table[j][1],
            tourName: tour.name, boutIdx: gi + 1,
          });
        }
      }
    }
  }

  const players = Array.from(playerSet).sort((a, b) => a.localeCompare(b, "ru"));

  const gamesOf: Record<string, RawGame[]> = {};
  const wdl: Record<string, { w: number; d: number; l: number; g: number }> = {};
  for (const p of players) { gamesOf[p] = []; wdl[p] = { w: 0, d: 0, l: 0, g: 0 }; }

  const crossIndex: Record<string, PocBout[]> = {};

  for (const g of allGames) {
    gamesOf[g.a].push(g);
    gamesOf[g.b].push(g);
    if (g.sA > g.sB)      { wdl[g.a].w++; wdl[g.b].l++; }
    else if (g.sA < g.sB) { wdl[g.b].w++; wdl[g.a].l++; }
    else                   { wdl[g.a].d++; wdl[g.b].d++; }
    wdl[g.a].g++;
    wdl[g.b].g++;

    const key = pairKey(g.a, g.b);
    if (!crossIndex[key]) crossIndex[key] = [];
    const isAFirst = key.startsWith(g.a + "|||");
    crossIndex[key].push({
      tourName: g.tourName,
      boutIdx: g.boutIdx,
      scoreA: isAFirst ? g.sA : g.sB,
      scoreB: isAFirst ? g.sB : g.sA,
    });
  }

  // POC — 20 iterations of strength update
  const str: Record<string, number> = {};
  for (const p of players) str[p] = 1.0;

  for (let iter = 0; iter < 20; iter++) {
    const next: Record<string, number> = {};
    for (const p of players) {
      if (!gamesOf[p].length) { next[p] = 0; continue; }
      let credits = 0;
      for (const g of gamesOf[p]) {
        const isA = g.a === p;
        const myScore  = isA ? g.sA : g.sB;
        const oppScore = isA ? g.sB : g.sA;
        const opp      = isA ? g.b  : g.a;
        const margin = Math.abs(myScore - oppScore);
        const marginFactor = Math.min(margin / 150, 1.0);

        if (myScore > oppScore)      credits += str[opp] * (1.0 + marginFactor);
        else if (myScore === oppScore) credits += str[opp] * 0.4;
        else                           credits += str[opp] * 0.1 * (1 - marginFactor);
      }
      next[p] = credits / gamesOf[p].length;
    }
    for (const p of players) str[p] = next[p];
  }

  const activePlayers = players.filter((p) => wdl[p].g > 0);
  const maxStr = Math.max(...activePlayers.map((p) => str[p]), 0.001);

  const pocRows: PocRow[] = activePlayers
    .map((p) => ({
      pos: 0,
      name: p,
      poc: Math.round((str[p] / maxStr) * 1000),
      sos: Math.round(
        (gamesOf[p].length
          ? gamesOf[p].reduce((s, g) => s + str[g.a === p ? g.b : g.a], 0) / gamesOf[p].length
          : 0) / maxStr * 1000,
      ),
      w: wdl[p].w, d: wdl[p].d, l: wdl[p].l, g: wdl[p].g,
    }))
    .sort((a, b) => b.poc - a.poc || a.name.localeCompare(b.name, "ru"));

  pocRows.forEach((r, i) => (r.pos = i + 1));

  const pocOrder = pocRows.map((r) => r.name);
  const crossTable: Record<string, PocCrossCell> = {};

  for (let i = 0; i < pocOrder.length; i++) {
    for (let j = i + 1; j < pocOrder.length; j++) {
      const pA = pocOrder[i];
      const pB = pocOrder[j];
      const key = pairKey(pA, pB);
      const bouts = crossIndex[key] ?? [];
      const isAFirst = key.startsWith(pA + "|||");

      let wA = 0, wB = 0, dr = 0;
      for (const b of bouts) {
        const sA = isAFirst ? b.scoreA : b.scoreB;
        const sB = isAFirst ? b.scoreB : b.scoreA;
        if (sA > sB) wA++;
        else if (sB > sA) wB++;
        else dr++;
      }

      crossTable[`${pA}|||${pB}`] = {
        winsA: wA, winsB: wB, draws: dr, total: bouts.length,
        bouts: bouts.map((b) => ({
          tourName: b.tourName, boutIdx: b.boutIdx,
          scoreA: isAFirst ? b.scoreA : b.scoreB,
          scoreB: isAFirst ? b.scoreB : b.scoreA,
        })),
      };
    }
  }

  return { poc: pocRows, crossPlayers: pocOrder, crossTable };
}
