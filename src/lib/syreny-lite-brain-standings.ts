/** Standings row for a brain-ring group / playoff block. */
export interface BrainStandingsRow {
  teamId: string;
  teamName: string;
  place: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  zeros: number;
  scoredFor: number;
  scoredAgainst: number;
  diff: number;
  points: number;
}

export interface BrainMatchInput {
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  /** When false, only live goals are applied (not W/D/L/points). */
  complete?: boolean;
}

/** Tournament points for one team in a single match. */
export function matchPoints(scoredFor: number, scoredAgainst: number): number {
  if (scoredFor > scoredAgainst) return 3;
  if (scoredFor === scoredAgainst) return scoredFor === 0 ? 0 : 2;
  return scoredFor === 0 ? 0 : 1;
}

function classifyMatch(scoredFor: number, scoredAgainst: number) {
  if (scoredFor > scoredAgainst) {
    return { win: 1, draw: 0, loss: 0, zero: 0 };
  }
  if (scoredFor < scoredAgainst) {
    const zero = scoredFor === 0 ? 1 : 0;
    return { win: 0, draw: 0, loss: 1, zero };
  }
  const zero = scoredFor === 0 ? 1 : 0;
  return { win: 0, draw: zero ? 0 : 1, loss: 0, zero };
}

interface TeamStats {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  zeros: number;
  scoredFor: number;
  scoredAgainst: number;
  points: number;
}

function headToHeadPoints(
  teamId: string,
  opponentId: string,
  matches: BrainMatchInput[],
): number | null {
  const m = matches.find(
    (x) =>
      (x.teamAId === teamId && x.teamBId === opponentId) ||
      (x.teamAId === opponentId && x.teamBId === teamId),
  );
  if (!m) return null;
  const forUs = m.teamAId === teamId ? m.scoreA : m.scoreB;
  const against = m.teamAId === teamId ? m.scoreB : m.scoreA;
  return matchPoints(forUs, against);
}

function miniGroupStats(
  teamIds: string[],
  matches: BrainMatchInput[],
): Map<string, Omit<TeamStats, "teamId">> {
  const stats = new Map<string, Omit<TeamStats, "teamId">>();
  for (const id of teamIds) {
    stats.set(id, {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      zeros: 0,
      scoredFor: 0,
      scoredAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (!teamIds.includes(m.teamAId) || !teamIds.includes(m.teamBId)) continue;
    const a = stats.get(m.teamAId)!;
    const b = stats.get(m.teamBId)!;
    a.played++;
    b.played++;
    a.scoredFor += m.scoreA;
    a.scoredAgainst += m.scoreB;
    b.scoredFor += m.scoreB;
    b.scoredAgainst += m.scoreA;
    a.points += matchPoints(m.scoreA, m.scoreB);
    b.points += matchPoints(m.scoreB, m.scoreA);
    const ca = classifyMatch(m.scoreA, m.scoreB);
    const cb = classifyMatch(m.scoreB, m.scoreA);
    a.wins += ca.win;
    a.draws += ca.draw;
    a.losses += ca.loss;
    a.zeros += ca.zero;
    b.wins += cb.win;
    b.draws += cb.draw;
    b.losses += cb.loss;
    b.zeros += cb.zero;
  }
  return stats;
}

function compareStats(
  a: TeamStats,
  b: TeamStats,
  matches: BrainMatchInput[],
  tiedIds: string[],
): number {
  if (a.points !== b.points) return b.points - a.points;

  if (tiedIds.length === 2) {
    const h2hA = headToHeadPoints(a.teamId, b.teamId, matches);
    const h2hB = headToHeadPoints(b.teamId, a.teamId, matches);
    if (h2hA != null && h2hB != null && h2hA !== h2hB) return h2hB - h2hA;
  }

  if (tiedIds.length > 2) {
    const mini = miniGroupStats(tiedIds, matches);
    const ma = mini.get(a.teamId)!;
    const mb = mini.get(b.teamId)!;
    if (ma.points !== mb.points) return mb.points - ma.points;
    const diffA = ma.scoredFor - ma.scoredAgainst;
    const diffB = mb.scoredFor - mb.scoredAgainst;
    if (diffA !== diffB) return diffB - diffA;
    if (ma.scoredFor !== mb.scoredFor) return mb.scoredFor - ma.scoredFor;
  }

  const diffA = a.scoredFor - a.scoredAgainst;
  const diffB = b.scoredFor - b.scoredAgainst;
  if (diffA !== diffB) return diffB - diffA;
  if (a.scoredFor !== b.scoredFor) return b.scoredFor - a.scoredFor;
  return a.teamId.localeCompare(b.teamId);
}

export function computeStandings(
  teamIds: string[],
  teamNames: Record<string, string>,
  matches: BrainMatchInput[],
): BrainStandingsRow[] {
  const statsMap = new Map<string, TeamStats>();

  for (const id of teamIds) {
    statsMap.set(id, {
      teamId: id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      zeros: 0,
      scoredFor: 0,
      scoredAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (!statsMap.has(m.teamAId) || !statsMap.has(m.teamBId)) continue;
    const a = statsMap.get(m.teamAId)!;
    const b = statsMap.get(m.teamBId)!;
    const done = m.complete !== false;
    a.scoredFor += m.scoreA;
    a.scoredAgainst += m.scoreB;
    b.scoredFor += m.scoreB;
    b.scoredAgainst += m.scoreA;
    if (!done) continue;
    a.played++;
    b.played++;
    a.points += matchPoints(m.scoreA, m.scoreB);
    b.points += matchPoints(m.scoreB, m.scoreA);
    const ca = classifyMatch(m.scoreA, m.scoreB);
    const cb = classifyMatch(m.scoreB, m.scoreA);
    a.wins += ca.win;
    a.draws += ca.draw;
    a.losses += ca.loss;
    a.zeros += ca.zero;
    b.wins += cb.win;
    b.draws += cb.draw;
    b.losses += cb.loss;
    b.zeros += cb.zero;
  }

  const sorted = [...statsMap.values()].sort((a, b) => {
    const tied = [...statsMap.values()]
      .filter((t) => t.points === a.points)
      .map((t) => t.teamId);
    if (tied.includes(b.teamId) && tied.length > 1) {
      return compareStats(a, b, matches, tied);
    }
    return compareStats(a, b, matches, [a.teamId, b.teamId]);
  });

  return sorted.map((s, idx) => ({
    teamId: s.teamId,
    teamName: teamNames[s.teamId] ?? s.teamId,
    place: idx + 1,
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    zeros: s.zeros,
    scoredFor: s.scoredFor,
    scoredAgainst: s.scoredAgainst,
    diff: s.scoredFor - s.scoredAgainst,
    points: s.points,
  }));
}
