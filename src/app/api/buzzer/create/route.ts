import { NextResponse } from "next/server";
import { createGame } from "@/lib/buzzer-store";

export async function POST() {
  const { code, adminToken } = createGame();
  return NextResponse.json({ code, adminToken });
}
