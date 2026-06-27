import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import {
  fetchOchpStatsPageData,
  OCHP_STATS_PAGE_SIZE,
  paginateOchpStatsTable,
  type OchpStatsTableId,
} from "@/lib/ochp-stats";

const getCachedOchpStats = unstable_cache(
  fetchOchpStatsPageData,
  ["ochp-stats-page-data"],
  { revalidate: 3600 },
);

const TABLES: OchpStatsTableId[] = ["seasons", "teams", "players"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableRaw = searchParams.get("table");
  if (!tableRaw || !TABLES.includes(tableRaw as OchpStatsTableId)) {
    return NextResponse.json({ error: "invalid table" }, { status: 400 });
  }
  const table = tableRaw as OchpStatsTableId;

  const pageRaw = searchParams.get("page");
  const page = pageRaw != null ? parseInt(pageRaw, 10) : 1;
  if (Number.isNaN(page) || page < 1) {
    return NextResponse.json({ error: "invalid page" }, { status: 400 });
  }

  const pageSizeRaw = searchParams.get("pageSize");
  const pageSize =
    pageSizeRaw != null ? parseInt(pageSizeRaw, 10) : OCHP_STATS_PAGE_SIZE;
  if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json({ error: "invalid pageSize" }, { status: 400 });
  }

  try {
    const data = await getCachedOchpStats();
    const payload = paginateOchpStatsTable(data, table, page, pageSize);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "failed to load stats" }, { status: 500 });
  }
}
