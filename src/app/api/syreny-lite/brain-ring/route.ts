import { NextResponse } from "next/server";
import {
  ensureBrainTournamentLoaded,
  getBrainTournamentState,
} from "@/lib/syreny-lite-brain-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await ensureBrainTournamentLoaded();
  return NextResponse.json(getBrainTournamentState());
}
