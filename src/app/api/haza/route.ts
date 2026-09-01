import { NextResponse } from "next/server";
import { fetchHazaBroadcastData } from "@/lib/ochp-haza";
import { isAllowedHazaBroadcastId, isPrismaMissingTable } from "@/lib/page-widgets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("broadcastId");
  const broadcastId = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(broadcastId) || broadcastId <= 0) {
    return NextResponse.json({ error: "Invalid broadcastId" }, { status: 400 });
  }

  try {
    const allowed = await isAllowedHazaBroadcastId(broadcastId);
    if (!allowed) {
      return NextResponse.json({ error: "Invalid broadcastId" }, { status: 400 });
    }
  } catch (e) {
    if (!isPrismaMissingTable(e)) {
      console.error("haza allowlist failed", e);
      return NextResponse.json({ error: "database unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Invalid broadcastId" }, { status: 400 });
  }

  try {
    const data = await fetchHazaBroadcastData(broadcastId);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
