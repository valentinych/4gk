import { NextResponse } from "next/server";
import { listOchchAmateurTeamIds } from "@/lib/ochch-amateur";
import { applyOchchBoardTeams } from "@/lib/ochch-board";
import {
  OCHCH_CHGK_SHEET_ID,
  OCHCH_CHGK_TOURS,
  OCHCH_TEAMS,
  listOchchParticipants,
} from "@/lib/ochch";
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

async function enrichOchchLivePayload(payload: ChgkLivePayload) {
  let participants = [...OCHCH_TEAMS];
  try {
    const fromDb = await listOchchParticipants();
    if (fromDb.length > 0) participants = fromDb;
  } catch {
    /* seed list is enough for name matching */
  }
  const amateurIds = await listOchchAmateurTeamIds();
  return applyOchchBoardTeams(payload, participants, amateurIds);
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(await enrichOchchLivePayload(cache.payload), {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  }

  try {
    const payload = await loadChgkLiveSheet(OCHCH_LIVE_SHEET);
    cache = { ts: now, payload };
    return NextResponse.json(await enrichOchchLivePayload(payload), {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  } catch (err) {
    if (cache) {
      return NextResponse.json(await enrichOchchLivePayload(cache.payload), {
        headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=30" },
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 },
    );
  }
}
