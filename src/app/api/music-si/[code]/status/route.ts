import { NextResponse } from "next/server";
import { getMusicRoomStatus } from "@/lib/music-si-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const status = getMusicRoomStatus(code);
  if (!status) return NextResponse.json({ exists: false }, { status: 404 });
  return NextResponse.json(status);
}
