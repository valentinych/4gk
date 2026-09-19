import { NextResponse } from "next/server";
import {
  fetchSheetTable,
  parseGoogleSheetsUrl,
  SHEET_ACCESS_ERROR,
} from "@/lib/google-sheets";
import { computeFromTours } from "@/lib/parsers/poc-calculator";
import {
  parseLeagueTable,
  parsePackTab,
  startedPocTables,
  type IsiLeagueTable,
  type IsiPack,
} from "@/lib/warsaw-isi-live";
import {
  WARSAW_ISI_LEAGUES,
  WARSAW_ISI_PACKS,
  warsawIsiTabUrl,
  type IsiSheetTab,
} from "@/lib/warsaw-seasons";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const [leagues, packs] = await Promise.all([
    Promise.all(WARSAW_ISI_LEAGUES.map(loadLeague)),
    Promise.all(WARSAW_ISI_PACKS.map(loadPack)),
  ]);

  const pocTours = startedPocTables(packs);
  const poc = pocTours.length ? computeFromTours(pocTours).poc : [];

  return NextResponse.json({ leagues, packs, poc });
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
