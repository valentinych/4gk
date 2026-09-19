import { NextResponse } from "next/server";
import {
  fetchSheetTable,
  parseGoogleSheetsUrl,
  SHEET_ACCESS_ERROR,
  type SheetTableData,
} from "@/lib/google-sheets";
import {
  WARSAW_ISI_TOUR_STRIP,
  type IsiTourSlot,
  type IsiTourTable,
} from "@/lib/warsaw-seasons";

export const dynamic = "force-dynamic";

export async function GET() {
  const tours = await Promise.all(WARSAW_ISI_TOUR_STRIP.map(loadTour));
  return NextResponse.json({ tours });
}

async function loadTour(slot: IsiTourSlot): Promise<IsiTourTable> {
  const base = {
    id: slot.id,
    title: slot.title,
    seasonLabel: slot.seasonLabel,
  };

  try {
    const parsed = parseGoogleSheetsUrl(slot.url);
    if (parsed == null) {
      return {
        ...base,
        headers: [],
        rows: [],
        viewUrl: slot.url,
        error: SHEET_ACCESS_ERROR,
      };
    }

    const data = await fetchSheetTable(parsed);
    const table = slot.headerless ? asHeaderlessPlayerScores(data) : data;
    return {
      ...base,
      headers: table.headers,
      rows: table.rows,
      viewUrl: table.viewUrl,
      error: null,
    };
  } catch (e) {
    const access = e instanceof Error && e.message === SHEET_ACCESS_ERROR;
    return {
      ...base,
      headers: [],
      rows: [],
      viewUrl: slot.url,
      error: access ? SHEET_ACCESS_ERROR : "Не удалось загрузить таблицу",
    };
  }
}

function asHeaderlessPlayerScores(data: SheetTableData): SheetTableData {
  const rows = [data.headers, ...data.rows].map((row) => {
    const name = row[0] ?? "";
    const score = row[1] ?? "";
    return [name, score];
  });
  return {
    headers: ["Игрок", "Очки"],
    rows,
    viewUrl: data.viewUrl,
  };
}
