import { NextResponse } from "next/server";
import { parseHazaResultsXml } from "@/lib/ochp-haza";
import {
  OCHP_CHGK_HAZA_BROADCAST_CURRENT,
  ochpChgkHazaBroadcastAllowlist,
} from "@/lib/ochp-seasons";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("broadcastId");
  const allow = new Set(ochpChgkHazaBroadcastAllowlist());
  const broadcastId =
    raw != null && raw !== ""
      ? parseInt(raw, 10)
      : OCHP_CHGK_HAZA_BROADCAST_CURRENT;
  if (!Number.isFinite(broadcastId) || !allow.has(broadcastId)) {
    return NextResponse.json({ error: "Invalid broadcastId" }, { status: 400 });
  }

  try {
    const body = `id=${broadcastId}&s=0&b=1&vis_img=1&sec=60&last_id=0&k=variants_${broadcastId}&v=&tz=-1`;
    const res = await fetch("https://www.haza.online/get_bcast_results.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const xml = await res.text();
    const data = parseHazaResultsXml(xml);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
