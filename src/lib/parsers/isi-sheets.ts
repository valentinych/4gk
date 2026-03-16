const RATING_SHEET_ID = "1QVmAvn4CywgLAghbcJWKWJT9jjZteZJZ4c_T--9ltF8";
const RATING_GID = "2116382604";
const MATCHES_SHEET_ID = "1HAwO5bSZPUL-ZPW-vmI1iVXXYMwzQ2Vi2qJcyrdaDco";

export interface IsiRatingRow {
  pos: string;
  name: string;
  total: number;
  tours: (number | null)[];
  trend?: string;
}

export interface IsiPocRow {
  pos: number;
  name: string;
  poc: number;
  sos: number;
  w: number;
  d: number;
  l: number;
  g: number;
}

export interface IsiBout {
  tourName: string;
  boutIdx: number;
  scoreA: number;
  scoreB: number;
}

export interface IsiCrossCell {
  winsA: number;
  winsB: number;
  draws: number;
  total: number;
  bouts: IsiBout[];
}

export interface IsiData {
  rating: IsiRatingRow[];
  poc: IsiPocRow[];
  crossPlayers: string[];
  crossTable: Record<string, IsiCrossCell>;
}

export async function parseIsiSheets(): Promise<IsiData> {
  const [rating, tours] = await Promise.all([
    fetchRating(),
    fetchAllTours(),
  ]);

  const { poc, crossPlayers, crossTable } = computeFromTours(tours);
  return { rating, poc, crossPlayers, crossTable };
}

async function fetchRating(): Promise<IsiRatingRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${RATING_SHEET_ID}/export?format=csv&gid=${RATING_GID}`;
  const text = await fetch(url).then((r) => r.text());
  const rows: IsiRatingRow[] = [];

  const lines = text.split("\n");
  let tourCount = 0;

  for (const line of lines) {
    const cells = line.split(",").map((c) => c.trim());
    const c0 = cells[0] ?? "";
    const c1 = cells[1] ?? "";

    if (c1 === "Игрок") {
      tourCount = cells.filter((c) => /^Тур\s+\d+$/i.test(c)).length;
      continue;
    }
    if (!c0 || !c1) continue;
    if (!/^\d+$/.test(c0)) continue;

    const total = parseFloat(cells[3] ?? "0") || 0;
    const tours: (number | null)[] = [];
    for (let i = 4; i < 4 + tourCount; i++) {
      const v = parseFloat(cells[i] ?? "");
      tours.push(isNaN(v) ? null : v);
    }

    const lastCell = cells[cells.length - 1] ?? "";
    let trend: string | undefined;
    if (lastCell.includes("⬆")) trend = "up";
    else if (lastCell.includes("⬇")) trend = "down";

    rows.push({ pos: c0, name: c1, total, tours, trend });
  }

  return rows;
}

interface Tour {
  name: string;
  tables: [string, number][][];
}

async function discoverTabs(): Promise<{ name: string; gid: string }[]> {
  const url = `https://docs.google.com/spreadsheets/d/${MATCHES_SHEET_ID}/htmlview`;
  const html = await fetch(url).then((r) => r.text());
  const tabs: { name: string; gid: string }[] = [];
  const re = /name:\s*"([^"]*)".*?gid:\s*"(\d+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    tabs.push({ name: m[1].trim(), gid: m[2] });
  }
  tabs.sort((a, b) => a.name.localeCompare(b.name));
  return tabs;
}

async function parseTabCsv(gid: string): Promise<[string, number][][]> {
  const url = `https://docs.google.com/spreadsheets/d/${MATCHES_SHEET_ID}/export?format=csv&gid=${gid}`;
  const text = await fetch(url).then((r) => r.text());
  const groups: [string, number][][] = [];
  let current: [string, number][] = [];

  for (const line of text.split("\n")) {
    const cells = line.split(",");
    const name = (cells[0] ?? "").trim().replace(/^"|"$/g, "");
    const scoreRaw = (cells[1] ?? "").trim().replace(/^"|"$/g, "");

    if (!name) {
      if (current.length) {
        groups.push(current);
        current = [];
      }
      continue;
    }

    const score = parseInt(scoreRaw, 10);
    if (isNaN(score)) continue;
    current.push([name, score]);
  }
  if (current.length) groups.push(current);
  return groups;
}

async function fetchAllTours(): Promise<Tour[]> {
  const tabs = await discoverTabs();
  if (!tabs.length) return [];
  const tours: Tour[] = [];
  for (const tab of tabs) {
    const tables = await parseTabCsv(tab.gid);
    if (tables.length) {
      tours.push({ name: tab.name, tables });
    }
  }
  return tours;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|||${b}` : `${b}|||${a}`;
}

function computeFromTours(tours: Tour[]): {
  poc: IsiPocRow[];
  crossPlayers: string[];
  crossTable: Record<string, IsiCrossCell>;
} {
  const playerSet = new Set<string>();
  const allGames: { a: string; b: string; sA: number; sB: number; tourName: string; boutIdx: number }[] = [];

  for (const tour of tours) {
    for (let gi = 0; gi < tour.tables.length; gi++) {
      const table = tour.tables[gi];
      for (const [name] of table) playerSet.add(name);
      for (let i = 0; i < table.length; i++) {
        for (let j = i + 1; j < table.length; j++) {
          allGames.push({
            a: table[i][0],
            b: table[j][0],
            sA: table[i][1],
            sB: table[j][1],
            tourName: tour.name,
            boutIdx: gi + 1,
          });
        }
      }
    }
  }

  const players = Array.from(playerSet).sort((a, b) => a.localeCompare(b, "ru"));

  const gamesOf: Record<string, typeof allGames> = {};
  const wdl: Record<string, { w: number; d: number; l: number; g: number }> = {};
  for (const p of players) {
    gamesOf[p] = [];
    wdl[p] = { w: 0, d: 0, l: 0, g: 0 };
  }

  const crossIndex: Record<string, IsiBout[]> = {};

  for (const g of allGames) {
    gamesOf[g.a].push(g);
    gamesOf[g.b].push(g);
    if (g.sA > g.sB) { wdl[g.a].w++; wdl[g.b].l++; }
    else if (g.sA < g.sB) { wdl[g.b].w++; wdl[g.a].l++; }
    else { wdl[g.a].d++; wdl[g.b].d++; }
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

  // POC iterative computation (20 iterations)
  const str: Record<string, number> = {};
  for (const p of players) str[p] = 1.0;

  for (let iter = 0; iter < 20; iter++) {
    const next: Record<string, number> = {};
    for (const p of players) {
      if (!gamesOf[p].length) { next[p] = 0; continue; }
      let credits = 0;
      for (const g of gamesOf[p]) {
        const isA = g.a === p;
        const myScore = isA ? g.sA : g.sB;
        const oppScore = isA ? g.sB : g.sA;
        const opp = isA ? g.b : g.a;
        const margin = Math.abs(myScore - oppScore);
        const marginFactor = Math.min(margin / 150, 1.0);

        if (myScore > oppScore) {
          credits += str[opp] * (1.0 + marginFactor);
        } else if (myScore === oppScore) {
          credits += str[opp] * 0.4;
        } else {
          credits += str[opp] * 0.1 * (1 - marginFactor);
        }
      }
      next[p] = credits / gamesOf[p].length;
    }
    for (const p of players) str[p] = next[p];
  }

  const activePlayers = players.filter((p) => wdl[p].g > 0);
  const maxStr = Math.max(...activePlayers.map((p) => str[p]), 0.001);

  const pocRows: IsiPocRow[] = activePlayers
    .map((p) => ({
      pos: 0,
      name: p,
      poc: Math.round((str[p] / maxStr) * 1000),
      sos: Math.round(
        (gamesOf[p].length
          ? gamesOf[p].reduce((sum, g) => sum + str[g.a === p ? g.b : g.a], 0) / gamesOf[p].length
          : 0) / maxStr * 1000
      ),
      w: wdl[p].w,
      d: wdl[p].d,
      l: wdl[p].l,
      g: wdl[p].g,
    }))
    .sort((a, b) => b.poc - a.poc || a.name.localeCompare(b.name, "ru"));

  pocRows.forEach((r, i) => (r.pos = i + 1));

  const pocOrder = pocRows.map((r) => r.name);

  const crossTable: Record<string, IsiCrossCell> = {};
  for (let i = 0; i < pocOrder.length; i++) {
    for (let j = i + 1; j < pocOrder.length; j++) {
      const pA = pocOrder[i];
      const pB = pocOrder[j];
      const key = pairKey(pA, pB);
      const bouts = crossIndex[key] || [];
      const isAFirst = key.startsWith(pA + "|||");

      let wA = 0, wB = 0, dr = 0;
      for (const b of bouts) {
        const sA = isAFirst ? b.scoreA : b.scoreB;
        const sB = isAFirst ? b.scoreB : b.scoreA;
        if (sA > sB) wA++;
        else if (sB > sA) wB++;
        else dr++;
      }

      const cellKey = `${pA}|||${pB}`;
      crossTable[cellKey] = {
        winsA: wA,
        winsB: wB,
        draws: dr,
        total: bouts.length,
        bouts: bouts.map((b) => ({
          tourName: b.tourName,
          boutIdx: b.boutIdx,
          scoreA: isAFirst ? b.scoreA : b.scoreB,
          scoreB: isAFirst ? b.scoreB : b.scoreA,
        })),
      };
    }
  }

  return { poc: pocRows, crossPlayers: pocOrder, crossTable };
}
