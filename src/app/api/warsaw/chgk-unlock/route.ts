import { NextResponse } from "next/server";
import {
  WAW27_UNLOCK_COOKIE,
  WAW27_UNLOCK_MAX_AGE,
  isWaw27Password,
  waw27UnlockCookieValue,
} from "@/lib/warsaw-chgk-unlock";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const password =
    body && typeof body === "object" && "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  if (!isWaw27Password(password)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = waw27UnlockCookieValue();
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: WAW27_UNLOCK_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/warsaw",
    maxAge: WAW27_UNLOCK_MAX_AGE,
  });
  return res;
}
