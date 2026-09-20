import { NextResponse } from "next/server";
import {
  fetchSheetCsv,
  fetchSheetTable,
  parseGoogleSheetsUrl,
  SHEET_ACCESS_ERROR,
} from "@/lib/google-sheets";
import { computeFromTours } from "@/lib/parsers/poc-calculator";
import {
  parseLeagueTable,
  parseMatchTourGroups,
  parsePackTab,
  pairwiseBoutsFromTour,
  prependCrossBouts,
  splitLastFourTours,
  startedPocTables,
  type IsiLeagueTable,
  type IsiPack,
  type IsiPocTour,
} from "@/lib/warsaw-isi-live";
import {
  WARSAW_ISI_LEAGUES,
  WARSAW_ISI_MATCH_ARCHIVE,
  WARSAW_ISI_PACKS,
  warsawIsiTabUrl,
  type IsiSheetTab,
  type IsiTourSlot,
} from "@/lib/warsaw-seasons";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ARCHIVE_TTL_MS = 30 * 60 * 1000;
let archivePocCache: { at: number; tours: IsiPocTour[] } | null = null;

export async function GET() {
  const [leagues, packs, archive] = await Promise.all([
    Promise.all(WARSAW_ISI_LEAGUES.map(loadLeague)),
    Promise.all(WARSAW_ISI_PACKS.map(loadPack)),
    loadMatchArchive(),
  ]);

  const liveTours = startedPocTables(packs);
  const { counted, older } = splitLastFourTours(archive, packs);
  const computed = counted.length
    ? computeFromTours(counted)
    : { poc: [], crossPlayers: [], crossTable: {} };

  const olderBouts = older.flatMap(pairwiseBoutsFromTour);
  const crossTable = olderBouts.length
    ? prependCrossBouts(computed.crossTable, olderBouts)
    : computed.crossTable;

  return NextResponse.json({
    leagues,
    packs,
    poc: computed.poc,
    pocIncludesTour5: liveTours.length > 0,
    crossPlayers: computed.crossPlayers,
    crossTable,
    currentSeasonTourNames: liveTours.map((t) => t.name),
    countedTourNames: counted.map((t) => t.name),
  });
}

async function loadMatchArchive(): Promise<IsiPocTour[]> {
  const now = Date.now();
  if (archivePocCache && now - archivePocCache.at < ARCHIVE_TTL_MS) {
    return archivePocCache.tours;
  }

  const tours = (await Promise.all(WARSAW_ISI_MATCH_ARCHIVE.map(loadArchiveTour))).filter(
    (t): t is IsiPocTour => t != null,
  );
  if (tours.length) archivePocCache = { at: now, tours };
  else if (archivePocCache) return archivePocCache.tours;
  return tours;
}

async function loadArchiveTour(slot: IsiTourSlot): Promise<IsiPocTour | null> {
  try {
    const parsed = parseGoogleSheetsUrl(slot.url);
    if (parsed == null) return null;
    const csv = await fetchSheetCsv(parsed);
    const tables = parseMatchTourGroups(csv);
    if (!tables.length) return null;
    return { name: slot.title, tables };
  } catch {
    return null;
  }
}

async function loadLeague(tab: IsiSheetTab): Promise<IsiLeagueTable> {
  const viewUrl = warsawIsiTabUrl(tab.gid);
  const base = { id: tab.id, title: tab.title };
  try {
    const parsed = parseGoogleSheetsUrl(viewUrl);
    if (parsed == null) {
      return { ...base, headers: [], rows: [], viewUrl, error: SHEET_ACCESS_ERROR };
    }
    const data = await fetchSheetTable(parsed);
    return parseLeagueTable(data, base);
  } catch (e) {
    const access = e instanceof Error && e.message === SHEET_ACCESS_ERROR;
    return {
      ...base,
      headers: [],
      rows: [],
      viewUrl,
      error: access ? SHEET_ACCESS_ERROR : "Не удалось загрузить таблицу",
    };
  }
}

async function loadPack(tab: IsiSheetTab): Promise<IsiPack> {
  const viewUrl = warsawIsiTabUrl(tab.gid);
  const base = { id: tab.id, title: tab.title };
  try {
    const parsed = parseGoogleSheetsUrl(viewUrl);
    if (parsed == null) {
      return {
        ...base,
        boutLabel: "",
        time: "",
        viewUrl,
        error: SHEET_ACCESS_ERROR,
        fights: [],
      };
    }
    const data = await fetchSheetTable(parsed);
    return parsePackTab(data, base);
  } catch (e) {
    const access = e instanceof Error && e.message === SHEET_ACCESS_ERROR;
    return {
      ...base,
      boutLabel: "",
      time: "",
      viewUrl,
      error: access ? SHEET_ACCESS_ERROR : "Не удалось загрузить таблицу",
      fights: [],
    };
  }
}
