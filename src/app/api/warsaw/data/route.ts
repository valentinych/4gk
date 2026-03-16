import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [chgk, ksi, isi] = await Promise.all([
    db.dataCache.findUnique({ where: { key: "warsaw-chgk" } }),
    db.dataCache.findUnique({ where: { key: "warsaw-ksi" } }),
    db.dataCache.findUnique({ where: { key: "warsaw-isi" } }),
  ]);

  return NextResponse.json({
    chgk: chgk?.value ?? null,
    ksi: ksi?.value ?? null,
    isi: isi?.value ?? null,
    updatedAt: chgk?.updatedAt ?? ksi?.updatedAt ?? isi?.updatedAt ?? null,
  });
}
