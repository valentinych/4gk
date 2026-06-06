/** Pairs for a single round-robin group. */
export type BrainPair = [string, string];

function pairsShareTeam(a: BrainPair, b: BrainPair): boolean {
  return (
    a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]
  );
}

function allRoundRobinPairs(teamIds: string[]): BrainPair[] {
  const pairs: BrainPair[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairs;
}

/**
 * Order round-robin matches so no team plays in two consecutive games.
 * Uses DFS; n ≤ 5 ⇒ at most 10 matches.
 */
export function scheduleRoundRobinNoBackToBack(teamIds: string[]): BrainPair[] {
  const pairs = allRoundRobinPairs(teamIds);
  if (pairs.length <= 1) return pairs;

  const used = new Array<boolean>(pairs.length).fill(false);
  const result: BrainPair[] = [];

  function dfs(): boolean {
    if (result.length === pairs.length) return true;
    const last = result[result.length - 1];
    for (let i = 0; i < pairs.length; i++) {
      if (used[i]) continue;
      if (result.length > 0 && pairsShareTeam(pairs[i], last)) continue;
      used[i] = true;
      result.push(pairs[i]);
      if (dfs()) return true;
      result.pop();
      used[i] = false;
    }
    return false;
  }

  for (let start = 0; start < pairs.length; start++) {
    result.length = 0;
    used.fill(false);
    used[start] = true;
    result.push(pairs[start]);
    if (dfs()) return [...result];
  }

  return pairs;
}
