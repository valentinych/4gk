/** Warsaw club championship. `start` is the first calendar year (2025 → 2025/2026). */

export const WARSAW_CURRENT_SEASON_START = 2026;

export const WARSAW_SEASON_STARTS = [2026, 2025] as const;

export type WarsawSeasonStart = (typeof WARSAW_SEASON_STARTS)[number];

export function formatWarsawSeason(start: number): string {
  return `${start}/${start + 1}`;
}

export function parseWarsawSeasonStart(raw: string | null | undefined): WarsawSeasonStart {
  const n = Number(raw);
  if (n === 2025) return 2025;
  return WARSAW_CURRENT_SEASON_START;
}

export function isWarsawCurrentSeason(start: number): boolean {
  return start === WARSAW_CURRENT_SEASON_START;
}

const RATING_SHEET = "1QVmAvn4CywgLAghbcJWKWJT9jjZteZJZ4c_T--9ltF8";
const MATCHES_SHEET = "1HAwO5bSZPUL-ZPW-vmI1iVXXYMwzQ2Vi2qJcyrdaDco";
const TOUR5_SHEET = "1bd0nD3YL-aw4qzs_wc8Dx54VtIOR3Sv0HEtjLR4ep64";

export type IsiTourSlot = {
  id: string;
  title: string;
  seasonLabel: string;
  url: string;
  /** First CSV row is a player, not a header (matches-sheet tour tabs). */
  headerless?: boolean;
};

export type IsiTourTable = {
  id: string;
  title: string;
  seasonLabel: string;
  headers: string[];
  rows: string[][];
  viewUrl: string;
  error: string | null;
};

/**
 * ИСИ «последние 4 тура» on the current season:
 * last 3 completed 2025/26 tours + live тур 5 of 2026/27.
 *
 * 2025/26 rating sheet has Table1–Table3 (туры 1–3). Matches sheet also has
 * Tour4 (used for POC). Next club tour is numbered 5, so the strip drops
 * the oldest rating tour and keeps 2, 3, 4 + 5.
 */
export const WARSAW_ISI_TOUR_STRIP: IsiTourSlot[] = [
  {
    id: "tour2",
    title: "Тур 2",
    seasonLabel: "2025/2026",
    url: `https://docs.google.com/spreadsheets/d/${RATING_SHEET}/edit?gid=1770511093`,
  },
  {
    id: "tour3",
    title: "Тур 3",
    seasonLabel: "2025/2026",
    url: `https://docs.google.com/spreadsheets/d/${RATING_SHEET}/edit?gid=1369114843`,
  },
  {
    id: "tour4",
    title: "Тур 4",
    seasonLabel: "2025/2026",
    url: `https://docs.google.com/spreadsheets/d/${MATCHES_SHEET}/edit?gid=97351171`,
    headerless: true,
  },
  {
    id: "tour5",
    title: "Тур 5",
    seasonLabel: "2026/2027",
    url: `https://docs.google.com/spreadsheets/d/${TOUR5_SHEET}/edit?gid=651117540`,
  },
];
