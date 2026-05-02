/** Prague results helpers (client + server-safe). */

export interface PragueTourMeta {
  name: string;
  questionCount: number;
}

export interface PragueTourResult {
  name: string;
  total: number;
  marks: (boolean | null)[];
}

export interface PragueTeamRow {
  team: string;
  city: string;
  number: string;
  total: number;
  place: string;
  tours: PragueTourResult[];
}

/** Highest global question index (1-based across tours) where at least one team has «+». */
export function lastQuestionWithAnyPlus(
  teams: PragueTeamRow[],
  tours: PragueTourMeta[],
): number {
  let last = 0;
  let offset = 0;
  for (let ti = 0; ti < tours.length; ti++) {
    const qc = tours[ti].questionCount;
    for (const team of teams) {
      const marks = team.tours[ti]?.marks ?? [];
      for (let qi = 0; qi < qc && qi < marks.length; qi++) {
        if (marks[qi] === true) {
          const g = offset + qi + 1;
          if (g > last) last = g;
        }
      }
    }
    offset += qc;
  }
  return last;
}

/** Рейтинг вопроса = число команд с «−» на этом вопросе + 1. */
export function questionRatingValue(
  teams: PragueTeamRow[],
  tourIdx: number,
  questionIdx: number,
): number {
  let notTaking = 0;
  for (const team of teams) {
    const m = team.tours[tourIdx]?.marks[questionIdx];
    if (m === false) notTaking++;
  }
  return notTaking + 1;
}

/** Сумма рейтингов по всем взятым вопросам команды. */
export function teamRatingSum(
  team: PragueTeamRow,
  teams: PragueTeamRow[],
  tours: PragueTourMeta[],
): number {
  let sum = 0;
  for (let ti = 0; ti < tours.length; ti++) {
    const qc = tours[ti].questionCount;
    const marks = team.tours[ti]?.marks ?? [];
    for (let qi = 0; qi < qc && qi < marks.length; qi++) {
      if (marks[qi] === true) {
        sum += questionRatingValue(teams, ti, qi);
      }
    }
  }
  return sum;
}

export interface RatingRow {
  team: PragueTeamRow;
  rating: number;
  place: string;
}

export function buildRatingRanking(
  teams: PragueTeamRow[],
  tours: PragueTourMeta[],
): RatingRow[] {
  const withRating = teams.map((team) => ({
    team,
    rating: teamRatingSum(team, teams, tours),
  }));
  withRating.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.team.total !== a.team.total) return b.team.total - a.team.total;
    return a.team.team.localeCompare(b.team.team, "ru");
  });

  const rows: RatingRow[] = [];
  let i = 0;
  while (i < withRating.length) {
    let j = i + 1;
    while (
      j < withRating.length &&
      withRating[j].rating === withRating[i].rating
    ) {
      j++;
    }
    const start = i + 1;
    const end = j;
    const label = end > start ? `${start}-${end}` : `${start}`;
    for (let k = i; k < j; k++) {
      rows.push({
        team: withRating[k].team,
        rating: withRating[k].rating,
        place: label,
      });
    }
    i = j;
  }
  return rows;
}
