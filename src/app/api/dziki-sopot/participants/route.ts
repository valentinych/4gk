import { NextResponse } from "next/server";
import { fetchDsParticipants } from "@/lib/ds-participants";

export type { ParticipantCategory, DsParticipant } from "@/lib/ds-participants";

export async function GET() {
  try {
    const participants = await fetchDsParticipants();
    return NextResponse.json({ participants });
  } catch (err) {
    console.error("[DS participants]", err);
    return NextResponse.json({ participants: [] });
  }
}
