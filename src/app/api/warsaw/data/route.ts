import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adaptMicromatchesPayload,
  fetchMicromatchesTournament,
  micromatchesPayloadsDiffer,
  parseMicromatches,
  type MicroMatchesData,
} from "@/lib/parsers/micromatches";
import { parseKsiSheets } from "@/lib/parsers/ksi-sheets";
import { WARSAW_CHGK_2627_SLUG, WARSAW_KSI_2627_SHEET_ID } from "@/lib/warsaw-seasons";
import { WAW27_UNLOCK_COOKIE, isWaw27Unlocked, waw27Password } from "@/lib/warsaw-chgk-unlock";

export const dynamic = "force-dynamic";

/** Season 2025/26 CHGK (micromatches slug waw-26). Current season does not read this. */
const WARSAW_2526_SLUG = "waw-26";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("season") === "2026") {
    return season2026();
  }
  return season2025();
}

async function season2025() {
  const [chgkLive, cached] = await Promise.all([
    parseMicromatches(WARSAW_2526_SLUG).catch(() => null),
    loadCache(),
  ]);

  const chgk = chgkLive ?? cached.chgk?.value ?? null;
  const updatedAt =
    chgkLive?.generatedAt ??
    cached.chgk?.updatedAt ??
    cached.ksi?.updatedAt ??
    cached.isi?.updatedAt ??
    null;

  return NextResponse.json({
    chgk,
    ksi: cached.ksi?.value ?? null,
    isi: cached.isi?.value ?? null,
    updatedAt,
  });
}

/** Season 2026/27. Password URL is fetched on the server; the cookie only records acceptance. */
async function season2026() {
  const jar = await cookies();
  const unlocked = isWaw27Unlocked(jar.get(WAW27_UNLOCK_COOKIE)?.value);
  const password = waw27Password();

  let chgk: MicroMatchesData | null = null;
  let chgkNeedsPassword = false;

  if (unlocked) {
    chgk = await parseMicromatches(WARSAW_CHGK_2627_SLUG, password).catch(() => null);
  } else {
    const viewed = await loadLockedChgk(password);
    chgk = viewed.chgk;
    chgkNeedsPassword = viewed.needsPassword;
  }

  const ksi = await parseKsiSheets(WARSAW_KSI_2627_SHEET_ID).catch(() => null);

  return NextResponse.json({
    chgk,
    ksi,
    isi: null,
    updatedAt: chgk?.generatedAt ?? null,
    chgkNeedsPassword,
  });
}

/**
 * Locked view of 2026/27 CHGK. Show the password field unless both payloads
 * were fetched and match. A failed public fetch (micromatches 500s without
 * the password while the other URL returns access:full) is not a match.
 */
async function loadLockedChgk(password: string): Promise<{
  chgk: MicroMatchesData | null;
  needsPassword: boolean;
}> {
  const [publicResult, fullResult] = await Promise.allSettled([
    fetchMicromatchesTournament(WARSAW_CHGK_2627_SLUG),
    fetchMicromatchesTournament(WARSAW_CHGK_2627_SLUG, password),
  ]);

  const publicOk = publicResult.status === "fulfilled";
  const fullOk = fullResult.status === "fulfilled";
  const needsPassword =
    publicOk && fullOk
      ? micromatchesPayloadsDiffer(publicResult.value, fullResult.value)
      : true;

  let chgk: MicroMatchesData | null = null;
  if (publicOk) {
    try {
      chgk = adaptMicromatchesPayload(publicResult.value, WARSAW_CHGK_2627_SLUG);
    } catch {
      chgk = null;
    }
  }

  return { chgk, needsPassword };
}

async function loadCache() {
  try {
    const [chgk, ksi, isi] = await Promise.all([
      db.dataCache.findUnique({ where: { key: "warsaw-chgk" } }),
      db.dataCache.findUnique({ where: { key: "warsaw-ksi" } }),
      db.dataCache.findUnique({ where: { key: "warsaw-isi" } }),
    ]);
    return { chgk, ksi, isi };
  } catch {
    return { chgk: null, ksi: null, isi: null };
  }
}
