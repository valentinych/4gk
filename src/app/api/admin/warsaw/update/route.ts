import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { parseMicromatches } from "@/lib/parsers/micromatches";
import { parseKsiSheets } from "@/lib/parsers/ksi-sheets";
import { parseIsiSheets } from "@/lib/parsers/isi-sheets";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const errors: string[] = [];

  try {
    const chgkData = await parseMicromatches("waw-26");
    const json = JSON.parse(JSON.stringify(chgkData)) as Prisma.InputJsonValue;
    await db.dataCache.upsert({
      where: { key: "warsaw-chgk" },
      update: { value: json },
      create: { key: "warsaw-chgk", value: json },
    });
  } catch (e) {
    errors.push(`ЧГК: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  try {
    const ksiData = await parseKsiSheets();
    const json = JSON.parse(JSON.stringify(ksiData)) as Prisma.InputJsonValue;
    await db.dataCache.upsert({
      where: { key: "warsaw-ksi" },
      update: { value: json },
      create: { key: "warsaw-ksi", value: json },
    });
  } catch (e) {
    errors.push(`КСИ: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  try {
    const isiData = await parseIsiSheets();
    const json = JSON.parse(JSON.stringify(isiData)) as Prisma.InputJsonValue;
    await db.dataCache.upsert({
      where: { key: "warsaw-isi" },
      update: { value: json },
      create: { key: "warsaw-isi", value: json },
    });
  } catch (e) {
    errors.push(`ИСИ: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 207 });
  }

  return NextResponse.json({ ok: true });
}
