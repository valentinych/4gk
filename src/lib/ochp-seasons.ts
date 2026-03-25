/** Первый год сезона: 2025 → «2025/2026», заголовок ОЧП'26 */
export const OCHP_SEASON_START_MIN = 2017;
export const OCHP_SEASON_START_MAX = 2025;

export function parseOchpSeasonStart(raw: string | null | undefined): number {
  const y = parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(y)) return OCHP_SEASON_START_MAX;
  return Math.min(
    OCHP_SEASON_START_MAX,
    Math.max(OCHP_SEASON_START_MIN, y),
  );
}

export function formatOchpSeasonRange(seasonStart: number): string {
  return `${seasonStart}/${seasonStart + 1}`;
}

/** Двузначный год окончания сезона для «ОЧП'26» */
export function ochpYearSuffix(seasonStart: number): string {
  return String(seasonStart + 1).slice(-2);
}

export function ochpSeasonOptions(): number[] {
  const out: number[] = [];
  for (let y = OCHP_SEASON_START_MIN; y <= OCHP_SEASON_START_MAX; y++) {
    out.push(y);
  }
  return out.reverse();
}

/** Даты финала — только для актуального сезона на портале */
export function ochpMainDatesLabel(seasonStart: number): string {
  if (seasonStart === OCHP_SEASON_START_MAX) {
    return "21–22 марта 2026";
  }
  return "—";
}

export interface OchpLandingTile {
  slug: string;
  emoji: string;
  title: string;
  /** Внешняя ссылка; без href — внутренний путь /ochp/[slug] */
  href?: string;
}

/**
 * Плитки на главной /ochp для архивных сезонов (всё кроме 2025/2026).
 * Ключ — первый год сезона (как в ?season=2024). Добавляйте записи по одной плитке.
 *
 * Пример:
 *   2024: [{ slug: "schedule", emoji: "🗓️", title: "Расписание ОЧП'25" }],
 */
export const OCHP_ARCHIVE_TILES: Partial<
  Record<number, OchpLandingTile[]>
> = {};
