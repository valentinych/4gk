/**
 * Разбор повопросной маски результатов турнира rating.chgk.info.
 * Поле `mask` приходит только если в запросе указать includeMasksAndControversials=1
 * (по умолчанию в API — 0, поля mask и controversials отсутствуют).
 *
 * Документация: https://api.rating.chgk.info/?ui=re_doc — GET /tournaments/{id}/results
 */

/** Query string для GET /tournaments/{id}/results с масками и флагами команд (ЧСт и др.). */
export function ratingChgkResultsQuery(includeTeamMembers: 0 | 1): string {
  return new URLSearchParams({
    includeTeamMembers: String(includeTeamMembers),
    includeMasksAndControversials: "1",
    includeTeamFlags: "1",
  }).toString();
}

export interface TourSlice {
  tourNum: number;
  questionCount: number;
  /** Смещение в строке mask (0-based) */
  offset: number;
}

/** Туры по возрастанию номера, смещения в mask */
export function tourSlicesFromQuestionQty(
  questionQty: Record<string, number>,
): TourSlice[] {
  const parts = Object.entries(questionQty)
    .map(([k, v]) => ({ tourNum: parseInt(k, 10), questionCount: v }))
    .filter(
      (x) =>
        Number.isFinite(x.tourNum) &&
        typeof x.questionCount === "number" &&
        x.questionCount > 0,
    )
    .sort((a, b) => a.tourNum - b.tourNum);

  let offset = 0;
  return parts.map((p) => {
    const slice = { tourNum: p.tourNum, questionCount: p.questionCount, offset };
    offset += p.questionCount;
    return slice;
  });
}

export function expectedMaskLength(slices: TourSlice[]): number {
  return slices.reduce((a, s) => a + s.questionCount, 0);
}

export interface ParsedTourAnswers {
  tourNum: number;
  /** Символы вопросов: «1» взят, «0» нет, иное (например «X») — снятый/особый */
  cells: string[];
  sumOnes: number;
}

export function parseMaskIntoTours(
  mask: string,
  slices: TourSlice[],
): { tours: ParsedTourAnswers[]; remainder: string } {
  const tours: ParsedTourAnswers[] = [];
  for (const s of slices) {
    const chunk = mask.slice(s.offset, s.offset + s.questionCount);
    const cells = chunk.split("");
    const sumOnes = cells.filter((c) => c === "1").length;
    tours.push({ tourNum: s.tourNum, cells, sumOnes });
  }
  const len = expectedMaskLength(slices);
  const remainder = mask.length > len ? mask.slice(len) : "";
  return { tours, remainder };
}

/** Накопленная сумма после каждого тура (как «Σ после тура») */
export function cumulativeTourSums(tourSums: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const s of tourSums) {
    acc += s;
    out.push(acc);
  }
  return out;
}

/** Флаг «ЧСт» в ответе API (tournament_flags id 50) */
export const CHGK_TOURNAMENT_FLAG_CHST_ID = 50;

export function resultHasChstFlag(flags: unknown): boolean {
  if (!Array.isArray(flags)) return false;
  return flags.some((f) => {
    if (!f || typeof f !== "object") return false;
    const o = f as Record<string, unknown>;
    if (o.shortName === "ЧСт") return true;
    if (typeof o.id === "number" && o.id === CHGK_TOURNAMENT_FLAG_CHST_ID)
      return true;
    return false;
  });
}
