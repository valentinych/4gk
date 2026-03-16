import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [chgk, ksi] = await Promise.all([
    db.dataCache.findUnique({ where: { key: "warsaw-chgk" } }),
    db.dataCache.findUnique({ where: { key: "warsaw-ksi" } }),
  ]);

  return NextResponse.json({
    chgk: chgk?.value ?? null,
    ksi: ksi?.value ?? null,
    updatedAt: chgk?.updatedAt ?? ksi?.updatedAt ?? null,
  });
}
