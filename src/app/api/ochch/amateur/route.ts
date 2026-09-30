import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  canToggleOchchAmateur,
  isOchchKnownTeam,
  setOchchAmateurTeam,
} from "@/lib/ochch-amateur";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = await canToggleOchchAmateur(
    session.user.role,
    session.user.chgkId,
  );
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const teamChgkId = Number(raw.teamChgkId);
  if (!Number.isInteger(teamChgkId) || !isOchchKnownTeam(teamChgkId)) {
    return NextResponse.json({ error: "unknown team" }, { status: 400 });
  }
  if (typeof raw.amateur !== "boolean") {
    return NextResponse.json({ error: "amateur must be boolean" }, { status: 400 });
  }

  const amateur = await setOchchAmateurTeam(teamChgkId, raw.amateur);
  return NextResponse.json({ teamChgkId, amateur });
}
