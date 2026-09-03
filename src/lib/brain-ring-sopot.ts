import { matchPoints, type BrainMatchInput, type BrainStandingsRow } from "@/lib/syreny-lite-brain-standings";
import {
  SOPOT_REMATRIX,
  SOPOT_STAGE1_LETTERS,
  type BrainSlotSource,
} from "@/lib/brain-ring-presets";

export interface SopotTeam {
  id: string;
  name: string;
}

export interface SopotGroup {
  id: string;
  letter: string;
  teamIds: string[];
  sources?: BrainSlotSource[];
  tieBreak?: string[];
}

export interface SopotMatch {
  kind: string;
  sectionId: string;
  teamIds: string[];
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  complete: boolean;
}

/** Named teams only. Blank / whitespace names are refusals and do not play. */
export function playingTeamIds(teams: SopotTeam[], ids: string[]): string[] {
  const names = new Map(teams.map((t) => [t.id, t.name]));
  return ids.filter((id) => Boolean(id) && (names.get(id) ?? "").trim().length > 0);
}

export function pairCount(n: number): number {
  return n < 2 ? 0 : (n * (n - 1)) / 2;
}

export function placeCode(src: BrainSlotSource): string {
  if (src.kind === "place") return `${src.group}${src.place}`;
  if (src.kind === "overall") return `${src.place}-е общей`;
  return "";
}

export function rematrixSources(letter: string): BrainSlotSource[] {
  const row = SOPOT_REMATRIX.find((r) => r.letter === letter);
  return (row?.slots ?? []).map((s) => ({ kind: "place" as const, group: s.group, place: s.place }));
}

function asInput(m: SopotMatch): BrainMatchInput {
  return {
    teamAId: m.teamAId || m.teamIds[0] || "",
    teamBId: m.teamBId || m.teamIds[1] || "",
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    complete: m.complete,
  };
}

function twoTeamGroupMatches(matches: SopotMatch[], sectionId: string): BrainMatchInput[] {
  return matches
    .filter((m) => m.kind === "group" && m.sectionId === sectionId && m.teamIds.length <= 2 && m.complete)
    .map(asInput);
}

interface Stats {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoredFor: number;
  scoredAgainst: number;
  points: number;
}

function emptyStats(teamId: string): Stats {
  return { teamId, played: 0, wins: 0, draws: 0, losses: 0, scoredFor: 0, scoredAgainst: 0, points: 0 };
}

function accumulate(teamIds: string[], matches: BrainMatchInput[]): Map<string, Stats> {
  const stats = new Map<string, Stats>();
  for (const id of teamIds) stats.set(id, emptyStats(id));
  for (const m of matches) {
    if (!stats.has(m.teamAId) || !stats.has(m.teamBId)) continue;
    const a = stats.get(m.teamAId)!;
    const b = stats.get(m.teamBId)!;
    a.scoredFor += m.scoreA;
    a.scoredAgainst += m.scoreB;
    b.scoredFor += m.scoreB;
    b.scoredAgainst += m.scoreA;
    if (m.complete === false) continue;
    a.played += 1;
    b.played += 1;
    a.points += matchPoints(m.scoreA, m.scoreB);
    b.points += matchPoints(m.scoreB, m.scoreA);
    if (m.scoreA > m.scoreB) {
      a.wins += 1;
      b.losses += 1;
    } else if (m.scoreB > m.scoreA) {
      b.wins += 1;
      a.losses += 1;
    } else if (m.scoreA > 0) {
      a.draws += 1;
      b.draws += 1;
    }
  }
  return stats;
}

function h2hPoints(a: string, b: string, matches: BrainMatchInput[]): number | null {
  const m = matches.find(
    (x) =>
      (x.teamAId === a && x.teamBId === b) || (x.teamAId === b && x.teamBId === a),
  );
  if (!m || m.complete === false) return null;
  const forA = m.teamAId === a ? m.scoreA : m.scoreB;
  const againstA = m.teamAId === a ? m.scoreB : m.scoreA;
  return matchPoints(forA, againstA);
}

function miniPoints(ids: string[], matches: BrainMatchInput[]): Map<string, number> {
  const set = new Set(ids);
  const pts = new Map<string, number>();
  for (const id of ids) pts.set(id, 0);
  for (const m of matches) {
    if (!set.has(m.teamAId) || !set.has(m.teamBId) || m.complete === false) continue;
    pts.set(m.teamAId, (pts.get(m.teamAId) ?? 0) + matchPoints(m.scoreA, m.scoreB));
    pts.set(m.teamBId, (pts.get(m.teamBId) ?? 0) + matchPoints(m.scoreB, m.scoreA));
  }
  return pts;
}

function partitionBy<T>(ids: T[], key: (id: T) => number): T[][] {
  const buckets = new Map<number, T[]>();
  for (const id of ids) {
    const k = key(id);
    const list = buckets.get(k) ?? [];
    list.push(id);
    buckets.set(k, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, v]) => v);
}

/**
 * Group: points → H2H (3+ sequential mini) → diff → scored → lottery.
 * Combined: points → H2H if they actually played (2-way only) → diff → scored → lottery.
 * No teamId last-resort: leftover clusters stay tied (same place).
 */
export function rankSopot(
  teamIds: string[],
  names: Record<string, string>,
  matches: BrainMatchInput[],
  mode: "group" | "combined",
  lottery: string[] = [],
): BrainStandingsRow[] {
  const stats = accumulate(teamIds, matches);
  const lotteryAt = new Map(lottery.map((id, i) => [id, i]));

  function split(ids: string[]): string[][] {
    if (ids.length <= 1) return ids.length ? [ids] : [];

    const indicators: Array<(cluster: string[]) => string[][] | null> = [
      (cluster) => {
        if (cluster.length === 2) {
          const h = h2hPoints(cluster[0]!, cluster[1]!, matches);
          if (h == null) return null;
          const h2 = h2hPoints(cluster[1]!, cluster[0]!, matches);
          if (h2 == null || h === h2) return null;
          return h > h2 ? [[cluster[0]!], [cluster[1]!]] : [[cluster[1]!], [cluster[0]!]];
        }
        if (cluster.length > 2 && mode === "group") {
          const mini = miniPoints(cluster, matches);
          const parts = partitionBy(cluster, (id) => mini.get(id) ?? 0);
          return parts.length > 1 ? parts : null;
        }
        return null;
      },
      (cluster) => {
        const parts = partitionBy(cluster, (id) => {
          const s = stats.get(id)!;
          return s.scoredFor - s.scoredAgainst;
        });
        return parts.length > 1 ? parts : null;
      },
      (cluster) => {
        const parts = partitionBy(cluster, (id) => stats.get(id)!.scoredFor);
        return parts.length > 1 ? parts : null;
      },
      (cluster) => {
        if (!lottery.length) return null;
        const known = cluster.filter((id) => lotteryAt.has(id));
        if (known.length < 2) return null;
        const parts = partitionBy(cluster, (id) => {
          const at = lotteryAt.get(id);
          return at == null ? -1 : lottery.length - at;
        });
        return parts.length > 1 ? parts : null;
      },
    ];

    function resolve(cluster: string[]): string[][] {
      if (cluster.length <= 1) return [cluster];
      for (const ind of indicators) {
        const parts = ind(cluster);
        if (parts && parts.length > 1) return parts.flatMap(resolve);
      }
      return [cluster];
    }

    const byPoints = partitionBy(ids, (id) => stats.get(id)?.points ?? 0);
    return byPoints.flatMap(resolve);
  }

  const clusters = split(teamIds);
  const rows: BrainStandingsRow[] = [];
  let place = 1;
  for (const cluster of clusters) {
    for (const id of cluster) {
      const s = stats.get(id)!;
      rows.push({
        teamId: id,
        teamName: names[id] ?? id,
        place,
        played: s.played,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        zeros: 0,
        scoredFor: s.scoredFor,
        scoredAgainst: s.scoredAgainst,
        diff: s.scoredFor - s.scoredAgainst,
        points: s.points,
      });
    }
    place += cluster.length;
  }
  return rows;
}

export function uniqueTeamAtPlace(rows: BrainStandingsRow[], place: number): string {
  const hits = rows.filter((r) => r.place === place);
  if (hits.length !== 1) return "";
  return hits[0]!.teamId;
}

export function tiedClusters(rows: BrainStandingsRow[]): string[][] {
  const map = new Map<number, string[]>();
  for (const r of rows) {
    const list = map.get(r.place) ?? [];
    list.push(r.teamId);
    map.set(r.place, list);
  }
  return [...map.values()].filter((c) => c.length > 1);
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function lotteryOrderFromRows(rows: BrainStandingsRow[]): string[] {
  const map = new Map<number, string[]>();
  for (const r of rows) {
    const list = map.get(r.place) ?? [];
    list.push(r.teamId);
    map.set(r.place, list);
  }
  const out: string[] = [];
  for (const place of [...map.keys()].sort((a, b) => a - b)) {
    const cluster = map.get(place) ?? [];
    out.push(...(cluster.length > 1 ? shuffleInPlace([...cluster]) : cluster));
  }
  return out;
}

export function sopotStage1Groups(scheme: { stages: Array<{ type: string; groups?: SopotGroup[] }> }): SopotGroup[] {
  const stage = scheme.stages.find((s) => s.type === "groups" && s.groups?.some((g) => SOPOT_STAGE1_LETTERS.includes(g.letter as (typeof SOPOT_STAGE1_LETTERS)[number])));
  return stage?.groups?.filter((g) => SOPOT_STAGE1_LETTERS.includes(g.letter as (typeof SOPOT_STAGE1_LETTERS)[number])) ?? [];
}

export function sopotStage2Groups(scheme: { stages: Array<{ type: string; groups?: SopotGroup[] }> }): SopotGroup[] {
  const stages = scheme.stages.filter((s) => s.type === "groups");
  const stage2 = stages.find((s) => s.groups?.some((g) => g.letter === "E" || g.sources?.length));
  return stage2?.groups ?? [];
}

export function sopotGroupStandings(
  group: SopotGroup,
  teams: SopotTeam[],
  matches: SopotMatch[],
): BrainStandingsRow[] {
  const ids = playingTeamIds(teams, group.teamIds);
  const names: Record<string, string> = {};
  for (const t of teams) names[t.id] = t.name.trim() || t.id;
  return rankSopot(ids, names, twoTeamGroupMatches(matches, group.id), "group", group.tieBreak ?? []);
}

export function sopotEliminatedIds(teams: SopotTeam[], groups: SopotGroup[], matches: SopotMatch[]): Set<string> {
  const out = new Set<string>();
  for (const g of groups) {
    const playing = playingTeamIds(teams, g.teamIds);
    if (playing.length < 5) continue;
    const rows = sopotGroupStandings(g, teams, matches);
    const lastPlace = playing.length;
    const last = uniqueTeamAtPlace(rows, lastPlace);
    if (last) out.add(last);
  }
  return out;
}

export function sopotAdvancingIds(teams: SopotTeam[], groups: SopotGroup[], matches: SopotMatch[]): string[] {
  const eliminated = sopotEliminatedIds(teams, groups, matches);
  const ids: string[] = [];
  for (const g of groups) {
    for (const id of playingTeamIds(teams, g.teamIds)) {
      if (!eliminated.has(id)) ids.push(id);
    }
  }
  return ids;
}

/** Stage-1 matches among the 16, excluding vs the eliminated 5th, plus all stage-2 matches. */
export function sopotCombinedMatches(
  teams: SopotTeam[],
  stage1: SopotGroup[],
  matches: SopotMatch[],
): BrainMatchInput[] {
  const advancing = new Set(sopotAdvancingIds(teams, stage1, matches));
  return matches
    .filter((m) => {
      if (m.kind !== "group" || m.teamIds.length > 2 || !m.complete) return false;
      const a = m.teamAId || m.teamIds[0] || "";
      const b = m.teamBId || m.teamIds[1] || "";
      return advancing.has(a) && advancing.has(b);
    })
    .map(asInput);
}

export function sopotCombinedStandings(
  teams: SopotTeam[],
  stage1: SopotGroup[],
  matches: SopotMatch[],
  lottery: string[] = [],
): BrainStandingsRow[] {
  const ids = sopotAdvancingIds(teams, stage1, matches);
  const names: Record<string, string> = {};
  for (const t of teams) names[t.id] = t.name.trim() || t.id;
  return rankSopot(ids, names, sopotCombinedMatches(teams, stage1, matches), "combined", lottery);
}

export function groupMatchesComplete(playingCount: number, matches: SopotMatch[], sectionId: string): boolean {
  const groupMs = matches.filter((m) => m.kind === "group" && m.sectionId === sectionId);
  const expected = pairCount(playingCount);
  return expected > 0 && groupMs.length === expected && groupMs.every((m) => m.complete);
}

export function sopotFillStage2(
  teams: SopotTeam[],
  stage1: SopotGroup[],
  matches: SopotMatch[],
): { error: string } | { groups: Array<{ letter: string; teamIds: string[] }> } {
  for (const g of stage1) {
    const playing = playingTeamIds(teams, g.teamIds);
    if (playing.length < 2) {
      return { error: `В группе ${g.letter} недостаточно команд` };
    }
    if (!groupMatchesComplete(playing.length, matches, g.id)) {
      return { error: "Нужны итоги групп первого этапа — у каждой вышедшей команды должны быть сыграны все матчи этапа 1" };
    }
    const rows = sopotGroupStandings(g, teams, matches);
    const need = Math.min(4, playing.length);
    for (let p = 1; p <= need; p++) {
      if (!uniqueTeamAtPlace(rows, p)) {
        return { error: `Нужна жеребьёвка модератора — команды делят место в группе ${g.letter}` };
      }
    }
  }

  const groups: Array<{ letter: string; teamIds: string[] }> = [];
  for (const row of SOPOT_REMATRIX) {
    const teamIds: string[] = [];
    for (const slot of row.slots) {
      const g = stage1.find((x) => x.letter === slot.group);
      if (!g) return { error: `Нет группы ${slot.group}` };
      const id = uniqueTeamAtPlace(sopotGroupStandings(g, teams, matches), slot.place);
      if (!id) return { error: `Не удалось определить ${slot.group}${slot.place}` };
      teamIds.push(id);
    }
    groups.push({ letter: row.letter, teamIds });
  }
  return { groups };
}

export function sopotFillFinal(
  teams: SopotTeam[],
  stage1: SopotGroup[],
  stage2: SopotGroup[],
  matches: SopotMatch[],
  lottery: string[] = [],
): { error: string } | { teamIds: string[] } {
  for (const g of stage2) {
    const playing = playingTeamIds(teams, g.teamIds);
    if (playing.length < 4 || !groupMatchesComplete(playing.length, matches, g.id)) {
      return { error: "Сначала сыграйте второй этап — общая таблица ещё не ясна" };
    }
  }
  const rows = sopotCombinedStandings(teams, stage1, matches, lottery);
  if (rows.length < 4) return { error: "В общей таблице меньше 16 команд" };
  const teamIds: string[] = [];
  for (let p = 1; p <= 4; p++) {
    const id = uniqueTeamAtPlace(rows, p);
    if (!id) return { error: "Нужна жеребьёвка модератора — команды делят место в общей таблице" };
    teamIds.push(id);
  }
  return { teamIds };
}
