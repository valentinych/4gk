import { createHmac, timingSafeEqual } from "crypto";

/** httpOnly unlock for Warsaw CHGK 2026/27. Not a login session. */
export const WAW27_UNLOCK_COOKIE = "waw27_chgk_unlock";
export const WAW27_UNLOCK_MAX_AGE = 60 * 60 * 24 * 400;
const WAW27_SLUG = "waw-27";
const PASSWORD = "2503";

function sign(value: string): Buffer | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest();
}

export function waw27UnlockCookieValue(): string | null {
  const digest = sign(`unlock:${WAW27_SLUG}`);
  return digest ? digest.toString("base64url") : null;
}

export function isWaw27Unlocked(cookieValue: string | undefined): boolean {
  const expected = waw27UnlockCookieValue();
  if (!expected || !cookieValue) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isWaw27Password(input: string): boolean {
  const given = sign(`password:${input}`);
  const expected = sign(`password:${PASSWORD}`);
  if (!given || !expected || given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

/** Server-side only. Callers must not send this to the browser. */
export function waw27Password(): string {
  return PASSWORD;
}
