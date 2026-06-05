import { NextResponse } from "next/server";
import { getBrainTournamentState } from "@/lib/syreny-lite-brain-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getBrainTournamentState());
}
