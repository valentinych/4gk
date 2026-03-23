import { NextResponse } from "next/server";
import { getRoomStatus } from "@/lib/buzzer-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const status = getRoomStatus(code);
  if (!status) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }
  return NextResponse.json(status);
}
