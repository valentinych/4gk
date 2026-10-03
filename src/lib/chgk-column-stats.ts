/**
 * Median, mean, and trueDL under CHGK tour columns.
 * OCHP results and the OCHCH live board both use `hazaColumnStats`.
 */

import type { PragueTeamRow, PragueTourMeta } from "./prague-stats";
import {
  TRUEDL_COEFF_BASELINE,
  meanTrueDl,
  teamTrueDl,
} from "./truedl";

export function tourScoresFromAnswers(
  answers: string,
  tours: ReadonlyArray<{ q: number }>,
): number[] {
  const scores: number[] = [];
  let offset = 0;
  for (const tour of tours) {
    let s = 0;
    for (let i = 0; i < tour.q; i++) {
      if (answers[offset + i] === "1") s++;
    }
    scores.push(s);
    offset += tour.q;
  }
  return scores;
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function meanOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** 1 decimal, period — same as other score tables on the site. */
export function formatTenth(n: number | null): string {
  return n == null ? "—" : n.toFixed(1);
}

function tourHasStarted(
  tours: ReadonlyArray<{ q: number }>,
  tourIndex: number,
  lastQuestion: number,
): boolean {
  let offset = 0;
  for (let i = 0; i < tourIndex; i++) offset += tours[i]!.q;
  return lastQuestion > offset;
}

export interface ChgkColumnStats {
  sum: { median: number | null; mean: number | null; trueDl: number | null };
  tours: Array<{
    median: number | null;
    mean: number | null;
    trueDl: number | null;
  }>;
}

export function hazaColumnStats(
  teams: ReadonlyArray<{ answers: string; score: number; coeff?: number | null }>,
  tours: ReadonlyArray<{ q: number }>,
  lastQuestion: number,
): ChgkColumnStats {
  const started = tours.map((_, ti) => tourHasStarted(tours, ti, lastQuestion));
  const tourValues: number[][] = tours.map(() => []);
  const tourTrueDls: number[][] = tours.map(() => []);
  const sums: number[] = [];
  const sumTrueDls: number[] = [];
  let startedN = 0;
  for (let ti = 0; ti < tours.length; ti++) {
    if (started[ti]) startedN += tours[ti]!.q;
  }
  for (const team of teams) {
    sums.push(team.score);
    const sc = tourScoresFromAnswers(team.answers, tours);
    // null: rating was required and missing — omit from trueDL only.
    // omitted: OCHP / no lookup — documented C = 1.
    const includeTrueDl = team.coeff !== null;
    const coeff = team.coeff ?? TRUEDL_COEFF_BASELINE;
    let startedScore = 0;
    for (let ti = 0; ti < tours.length; ti++) {
      if (!started[ti]) continue;
      const q = sc[ti] ?? 0;
      tourValues[ti]!.push(q);
      if (!includeTrueDl) continue;
      startedScore += q;
      const dl = teamTrueDl(q, tours[ti]!.q, coeff);
      if (dl != null) tourTrueDls[ti]!.push(dl);
    }
    if (includeTrueDl && startedN > 0) {
      const dl = teamTrueDl(startedScore, startedN, coeff);
      if (dl != null) sumTrueDls.push(dl);
    }
  }
  return {
    sum: {
      median: medianOf(sums),
      mean: meanOf(sums),
      trueDl: meanTrueDl(sumTrueDls),
    },
    tours: tourValues.map((vals, ti) => ({
      median: medianOf(vals),
      mean: meanOf(vals),
      trueDl: started[ti] ? meanTrueDl(tourTrueDls[ti]!) : null,
    })),
  };
}

function answersOf(team: PragueTeamRow, tours: readonly PragueTourMeta[]): string {
  let answers = "";
  for (let ti = 0; ti < tours.length; ti++) {
    const qc = tours[ti]!.questionCount;
    const marks = team.tours[ti]?.marks ?? [];
    for (let qi = 0; qi < qc; qi++) {
      answers += marks[qi] === true ? "1" : "0";
    }
  }
  return answers;
}

/** Same scan as haza `parseHazaResultsXml`: last «1» in the answer string. */
function lastQuestionFromAnswers(answersList: readonly string[]): number {
  let lastQuestion = 0;
  for (const answers of answersList) {
    for (let i = answers.length - 1; i >= 0; i--) {
      if (answers[i] === "1") {
        lastQuestion = Math.max(lastQuestion, i + 1);
        break;
      }
    }
  }
  return lastQuestion;
}

/**
 * Sheet rows on the live board, scored like a haza answer string.
 * Taken mark → "1"; miss or not yet entered → "0".
 * `coeff` omitted → C = 1, same as OCHP when a team has no MAK band.
 * `coeff` null → the team stays in median/mean and is left out of trueDL.
 * `progressTeams` decides which tours have started (full field). Scores
 * still come from `teams` (the filtered table).
 */
export function pragueColumnStats(
  teams: readonly PragueTeamRow[],
  tours: readonly PragueTourMeta[],
  progressTeams: readonly PragueTeamRow[] = teams,
): ChgkColumnStats {
  const hazaTours = tours.map((t) => ({ q: t.questionCount }));
  const hazaTeams = teams.map((team) => ({
    answers: answersOf(team, tours),
    score: team.total,
    ...(team.coeff !== undefined ? { coeff: team.coeff } : {}),
  }));
  const progressAnswers =
    progressTeams === teams
      ? hazaTeams.map((t) => t.answers)
      : progressTeams.map((team) => answersOf(team, tours));
  return hazaColumnStats(
    hazaTeams,
    hazaTours,
    lastQuestionFromAnswers(progressAnswers),
  );
}
