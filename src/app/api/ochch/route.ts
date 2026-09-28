import { NextResponse } from "next/server";
import { OCHCH_CHGK_SHEET_ID, OCHCH_CHGK_TOURS } from "@/lib/ochch";
import {
  loadChgkLiveSheet,
  type ChgkLivePayload,
  type ChgkLiveSheetConfig,
} from "@/lib/chgk-live-sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OCHCH_LIVE_SHEET: ChgkLiveSheetConfig = {
  sheetId: OCHCH_CHGK_SHEET_ID,
  tours: OCHCH_CHGK_TOURS,
  defaultQuestionsPerTour: 15,
  userAgent: "4gk-ochch/1.0",
};

type CacheEntry = { ts: number; payload: ChgkLivePayload };
let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 25_000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  }

  try {
    const payload = await loadChgkLiveSheet(OCHCH_LIVE_SHEET);
    cache = { ts: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  } catch (err) {
    if (cache) {
      return NextResponse.json(cache.payload, {
        headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=30" },
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 },
    );
  }
}
