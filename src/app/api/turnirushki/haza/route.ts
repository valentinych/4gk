import { NextResponse } from "next/server";
import { parseHazaResultsXml } from "@/lib/ochp-haza";
import { turnirushkiHazaBroadcastAllowlist } from "@/lib/turnirushki-games";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("broadcastId");
  const broadcastId = raw ? parseInt(raw, 10) : NaN;
  const allow = new Set(turnirushkiHazaBroadcastAllowlist());

  if (!Number.isFinite(broadcastId) || !allow.has(broadcastId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = `id=${broadcastId}&s=0&b=1&vis_img=1&sec=60&last_id=0&k=variants_${broadcastId}&v=&tz=-1`;
  const res = await fetch("https://www.haza.online/get_bcast_results.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const xml = await res.text();
  if (!xml.includes("<bcast")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(parseHazaResultsXml(xml));
}
