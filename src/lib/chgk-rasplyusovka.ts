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
