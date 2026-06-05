import { NextResponse } from "next/server";
import { getSyrenyLiteOutOfCompetitionNames } from "@/lib/syreny-lite";
import { parseSyrenyLiteKsi } from "@/lib/parsers/syreny-lite-ksi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const outOfCompetitionNames = await getSyrenyLiteOutOfCompetitionNames();
    const data = await parseSyrenyLiteKsi(outOfCompetitionNames);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load KSI results";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
