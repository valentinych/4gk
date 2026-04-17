import { NextResponse } from "next/server";
import { fetchDsParticipants } from "@/lib/ds-participants";

export type { ParticipantCategory, DsParticipant } from "@/lib/ds-participants";

export async function GET() {
  try {
    const { participants, ratingReleaseDate } = await fetchDsParticipants();
    return NextResponse.json({ participants, ratingReleaseDate });
  } catch (err) {
    console.error("[DS participants]", err);
    return NextResponse.json({ participants: [], ratingReleaseDate: null });
  }
}
