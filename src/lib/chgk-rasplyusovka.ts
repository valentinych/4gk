/** Per-question CHGK matrix for the OCHCH «Расплюсовка» table. */

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

type MarkedTeam = {
  tours: readonly { marks: readonly (boolean | null | undefined)[] }[];
};

/** Pluses on questions 1..throughQuestion. Later cells are not in the score yet. */
export function pointsThroughQuestion(
  team: MarkedTeam,
  tours: TourCounts,
  throughQuestion: number,
): number {
  if (throughQuestion <= 0) return 0;
  let points = 0;
  let offset = 0;
  for (let ti = 0; ti < tours.length; ti++) {
    const qc = tours[ti]?.questionCount ?? 0;
    const marks = team.tours[ti]?.marks ?? [];
    for (let qi = 0; qi < qc; qi++) {
      if (offset + qi + 1 > throughQuestion) return points;
      if (marks[qi] === true) points += 1;
    }
    offset += qc;
  }
  return points;
}

/**
 * Competition place: tied scores share the start of the range (1-2 → 1).
 * Same grouping as the standings «М» labels.
 */
function competitionPlaceStarts(scores: readonly number[]): number[] {
  const order = scores.map((_, i) => i);
  order.sort((a, b) => scores[b]! - scores[a]!);
  const place = new Array<number>(scores.length);
  for (let i = 0; i < order.length; ) {
    let j = i + 1;
    const score = scores[order[i]!]!;
    while (j < order.length && scores[order[j]!] === score) j++;
    const rank = i + 1;
    for (let k = i; k < j; k++) place[order[k]!] = rank;
    i = j;
  }
  return place;
}

export type PlaceMove = "up" | "down";

/**
 * Place change for each team from the previous answered question to
 * `lastAnswered`, on this team set. Smaller place number is better.
 * No move when the place is unchanged or there is no previous question.
 */
export function placeMovesThroughLastQuestion(
  teams: readonly MarkedTeam[],
  tours: TourCounts,
  lastAnswered: number,
): Array<PlaceMove | null> {
  if (lastAnswered <= 1 || teams.length === 0) {
    return teams.map(() => null);
  }
  const prev = competitionPlaceStarts(
    teams.map((team) => pointsThroughQuestion(team, tours, lastAnswered - 1)),
  );
  const curr = competitionPlaceStarts(
    teams.map((team) => pointsThroughQuestion(team, tours, lastAnswered)),
  );
  return teams.map((_, i) => {
    const before = prev[i]!;
    const after = curr[i]!;
    if (after < before) return "up";
    if (after > before) return "down";
    return null;
  });
}
