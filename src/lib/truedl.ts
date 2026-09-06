/**
 * pecheny.me/blog/truedl — peczony/truedl `get_real_truedl`:
 *   trueDL = (1 − min(Q / C, N) / N) × 10
 * C is the MAK rating-place band coefficient (unit = 251–500).
 */

export const TRUEDL_COEFF_BASELINE = 1.0;

const TRUEDL_PLACE_BANDS: ReadonlyArray<{ maxPlace: number; coeff: number }> = [
  { maxPlace: 10, coeff: 1.61 },
  { maxPlace: 25, coeff: 1.52 },
  { maxPlace: 50, coeff: 1.43 },
  { maxPlace: 100, coeff: 1.32 },
  { maxPlace: 250, coeff: 1.16 },
  { maxPlace: 500, coeff: 1.0 },
  { maxPlace: 1000, coeff: 0.81 },
  { maxPlace: 2000, coeff: 0.6 },
  { maxPlace: 3000, coeff: 0.43 },
  { maxPlace: 5000, coeff: 0.31 },
];

export function trueDlCoeffFromMakPlace(place: number | null | undefined): number {
  if (place == null || !Number.isFinite(place) || place < 1) {
    return TRUEDL_COEFF_BASELINE;
  }
  for (const band of TRUEDL_PLACE_BANDS) {
    if (place <= band.maxPlace) return band.coeff;
  }
  return TRUEDL_COEFF_BASELINE;
}

export function teamTrueDl(
  questions: number,
  totalQuestions: number,
  coeff: number = TRUEDL_COEFF_BASELINE,
): number | null {
  if (totalQuestions <= 0 || coeff <= 0) return null;
  const taken = Math.min(questions / coeff, totalQuestions);
  return Number(((1 - taken / totalQuestions) * 10).toFixed(2));
}

export function meanTrueDl(dls: number[]): number | null {
  if (dls.length === 0) return null;
  return Number((dls.reduce((sum, v) => sum + v, 0) / dls.length).toFixed(2));
}

export function formatTrueDlHundredths(n: number | null): string {
  return n == null ? "—" : n.toFixed(2);
}
