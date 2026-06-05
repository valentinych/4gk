import { NextResponse } from "next/server";
import { loadSyrenyLiteChgkData } from "@/lib/syreny-lite-chgk";
import { getSyrenyLiteOutOfCompetitionNames } from "@/lib/syreny-lite";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const outOfCompetitionNames = await getSyrenyLiteOutOfCompetitionNames();
    const data = await loadSyrenyLiteChgkData(outOfCompetitionNames);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load CHGK results";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
