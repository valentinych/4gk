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
export const WARSAW_ISI_LIVE_SHEET = "1bd0nD3YL-aw4qzs_wc8Dx54VtIOR3Sv0HEtjLR4ep64";
const TOUR5_SHEET = WARSAW_ISI_LIVE_SHEET;

export const WARSAW_ISI_REFRESH_SECONDS = 40;

export type IsiSheetTab = {
  id: string;
  title: string;
  gid: string;
};

function liveSheetUrl(gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${WARSAW_ISI_LIVE_SHEET}/edit?gid=${gid}`;
}

export const WARSAW_ISI_LEAGUES: IsiSheetTab[] = [
  { id: "liga-a", title: "Лига А", gid: "1562140413" },
  { id: "liga-b", title: "Лига Б", gid: "1305443345" },
];

/** Pack1–Pack12 of the 2026/27 tour-5 sheet. No POC tab on this workbook. */
export const WARSAW_ISI_PACKS: IsiSheetTab[] = [
  { id: "pack1", title: "Пакет 1", gid: "1999256905" },
  { id: "pack2", title: "Пакет 2", gid: "1585206763" },
  { id: "pack3", title: "Пакет 3", gid: "819561584" },
  { id: "pack4", title: "Пакет 4", gid: "1000070431" },
  { id: "pack5", title: "Пакет 5", gid: "1811098162" },
  { id: "pack6", title: "Пакет 6", gid: "588268214" },
  { id: "pack7", title: "Пакет 7", gid: "736707848" },
  { id: "pack8", title: "Пакет 8", gid: "894686373" },
  { id: "pack9", title: "Пакет 9", gid: "1069783794" },
  { id: "pack10", title: "Пакет 10", gid: "345686414" },
  { id: "pack11", title: "Пакет 11", gid: "497298636" },
  { id: "pack12", title: "Пакет 12", gid: "2125444419" },
];

export function warsawIsiTabUrl(gid: string): string {
  return liveSheetUrl(gid);
}

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
