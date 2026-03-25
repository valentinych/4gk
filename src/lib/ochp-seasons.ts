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

/** Для query-параметра season: нет или невалидно → null */
export function parseOchpSeasonStartOptional(
  raw: string | null | undefined,
): number | null {
  if (raw == null || raw === "") return null;
  const y = parseInt(String(raw), 10);
  if (Number.isNaN(y)) return null;
  if (y < OCHP_SEASON_START_MIN || y > OCHP_SEASON_START_MAX) return null;
  return y;
}

/** Текущий ОЧП на портале (сезон 2025/2026) — API id = путь /tournament/:id */
export const OCHP_RATING_TOURNAMENT_ID_CURRENT = 13180;

/** ID турнира на rating.chgk.info по первому году сезона (архив) */
export const OCHP_RATING_TOURNAMENT_BY_SEASON: Partial<Record<number, number>> = {
  2024: 11706,
};

export function resolveOchpRatingTournamentId(
  seasonStart: number | null,
): number {
  if (seasonStart != null) {
    const mapped = OCHP_RATING_TOURNAMENT_BY_SEASON[seasonStart];
    if (mapped != null) return mapped;
  }
  return OCHP_RATING_TOURNAMENT_ID_CURRENT;
}

export function ochpRatingPublicUrl(tournamentId: number): string {
  return `https://rating.chgk.info/tournament/${tournamentId}`;
}

/** Трансляция ЧГК на haza.online для текущего ОЧП на портале */
export const OCHP_CHGK_HAZA_BROADCAST_CURRENT = 641;

/** ID трансляции haza по первому году сезона (архив) — см. get_bcast_results.php */
export const OCHP_CHGK_HAZA_BROADCAST_BY_SEASON: Partial<Record<number, number>> = {
  2024: 583,
};

export function resolveOchpChgkHazaBroadcastId(
  seasonStart: number | null,
): number {
  if (seasonStart != null) {
    const b = OCHP_CHGK_HAZA_BROADCAST_BY_SEASON[seasonStart];
    if (b != null) return b;
  }
  return OCHP_CHGK_HAZA_BROADCAST_CURRENT;
}

/** Разрешённые id для /api/ochp/haza (не пускаем произвольный proxy) */
export function ochpChgkHazaBroadcastAllowlist(): number[] {
  const s = new Set<number>([OCHP_CHGK_HAZA_BROADCAST_CURRENT]);
  for (const id of Object.values(OCHP_CHGK_HAZA_BROADCAST_BY_SEASON)) {
    if (typeof id === "number") s.add(id);
  }
  return [...s];
}

/** Участники из rating+haza (ЧСт), а не из Google Sheets */
export function ochpParticipantsFromRatingSeasons(): number[] {
  return Object.keys(OCHP_CHGK_HAZA_BROADCAST_BY_SEASON)
    .map((k) => parseInt(k, 10))
    .filter(
      (y) =>
        OCHP_RATING_TOURNAMENT_BY_SEASON[y] != null &&
        OCHP_CHGK_HAZA_BROADCAST_BY_SEASON[y] != null,
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
  /** `https://...` — внешняя; путь с `/` — внутренняя (например `/ochp/rating-page?season=2024`); без href — `/ochp/[slug]` */
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
> = {
  2024: [
    {
      slug: "rating-page",
      emoji: "🌐",
      title: "Страница турнира на сайте рейтинга",
      href: "/ochp/rating-page?season=2024",
    },
    {
      slug: "results-chgk",
      emoji: "❓",
      title: "Результаты Что? Где? Когда?",
      href: "/ochp/results-chgk?season=2024",
    },
    {
      slug: "participants",
      emoji: "👥",
      title: "Список участников ОЧП'25",
      href: "/ochp/participants?season=2024",
    },
  ],
};
