import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  buildPragueTournamentToursCsv,
  type PragueCsvPayload,
} from "@/lib/prague-tournament-csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/prague`, {
    cache: "no-store",
    headers: { "User-Agent": "4gk-prague-export/1.0" },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Не удалось загрузить данные ЧГК: HTTP ${res.status}` },
      { status: 502 },
    );
  }

  const payload = (await res.json()) as PragueCsvPayload;

  const csv = buildPragueTournamentToursCsv(payload);

  const BOM = "\uFEFF";
  const date = new Date().toISOString().slice(0, 10);
  const filename = `tournament-tours-prague-${date}.csv`;

  return new NextResponse(BOM + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
