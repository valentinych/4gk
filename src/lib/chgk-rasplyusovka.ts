/** Per-question CHGK matrix for the OCHCH «Расплюсовка» table. */

import type { PragueTeamRow } from "./prague-stats";

type TourCounts = readonly { questionCount: number }[];

/**
 * Sheet columns are plus-mode by default: an empty cell becomes «−».
 * Those minuses after the last question anyone took are not played yet.
 */
export function playedMark(
  mark: boolean | null | undefined,
  globalQuestion: number,
  lastTakenQuestion: number,
): boolean | null {
  if (lastTakenQuestion <= 0 || globalQuestion > lastTakenQuestion) return null;
  if (mark === true || mark === false) return mark;
  return null;
}

/**
 * Tour question k (1-based) is global `(sum of earlier tours) + k`.
 * For equal tour lengths that is `(tour - 1) * questionsPerTour + k`.
 */
export function globalQuestionNumber(
  tours: TourCounts,
  tourIdx: number,
  questionIdx: number,
): number {
  let offset = 0;
  for (let i = 0; i < tourIdx; i++) offset += tours[i]?.questionCount ?? 0;
  return offset + questionIdx + 1;
}

/** 0-based tour that contains a 1-based global question. Tour 1 when none yet. */
export function tourIndexForQuestion(
  tours: TourCounts,
  globalQuestion: number,
): number {
  if (tours.length === 0 || globalQuestion <= 0) return 0;
  let offset = 0;
  for (let i = 0; i < tours.length; i++) {
    const qc = tours[i]!.questionCount;
    if (globalQuestion <= offset + qc) return i;
    offset += qc;
  }
  return tours.length - 1;
}

/** Points from taken questions whose global number is ≤ `throughQuestion`. */
export function pointsThrough(
  team: PragueTeamRow,
  tours: TourCounts,
  throughQuestion: number,
): number {
  if (throughQuestion <= 0) return 0;
  let offset = 0;
  let sum = 0;
  for (let ti = 0; ti < tours.length; ti++) {
    const qc = tours[ti]!.questionCount;
    const marks = team.tours[ti]?.marks ?? [];
    for (let qi = 0; qi < qc; qi++) {
      const global = offset + qi + 1;
      if (global > throughQuestion) return sum;
      if (marks[qi] === true) sum += 1;
    }
    offset += qc;
  }
  return sum;
}

/** Standard competition place: 1 + teams with a strictly higher total. */
export function competitionPlaces(totals: readonly number[]): number[] {
  return totals.map(
    (total) => 1 + totals.reduce((ahead, other) => ahead + (other > total ? 1 : 0), 0),
  );
}

export type PlaceArrow = "up" | "down" | null;

/**
 * Place after `previousQuestion` vs after `lastQuestion`, on this team set.
 * No earlier answered question → every arrow is null.
 */
export function placeChangeArrows(
  teams: readonly PragueTeamRow[],
  tours: TourCounts,
  lastQuestion: number,
  previousQuestion: number | null,
): PlaceArrow[] {
  if (previousQuestion == null || lastQuestion <= 0) {
    return teams.map(() => null);
  }
  const nowRanks = competitionPlaces(
    teams.map((team) => pointsThrough(team, tours, lastQuestion)),
  );
  const prevRanks = competitionPlaces(
    teams.map((team) => pointsThrough(team, tours, previousQuestion)),
  );
  return nowRanks.map((rank, i) => {
    const prev = prevRanks[i]!;
    if (rank < prev) return "up";
    if (rank > prev) return "down";
    return null;
  });
}
