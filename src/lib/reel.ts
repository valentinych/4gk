/** YouTube clip helpers for the hidden /reel tool. Timecode parsing matches the cutter app. */

export const MAX_CLIP_SECONDS = 15 * 60;
export const MAX_URL_LENGTH = 2048;

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export function isYouTubeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return YT_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** First YouTube URL in pasted text (handles extra words / several links). */
export function extractYouTubeUrl(text: string): string | null {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  for (const m of matches) {
    const cleaned = m.replace(/[),.;]+$/, "");
    if (cleaned.length <= MAX_URL_LENGTH && isYouTubeUrl(cleaned)) return cleaned;
  }
  const trimmed = text.trim();
  if (trimmed.length <= MAX_URL_LENGTH && isYouTubeUrl(trimmed)) return trimmed;
  return null;
}

/**
 * Convert `MM:SS`, `HH:MM:SS`, or raw seconds (optionally fractional) to seconds.
 * Same rules as cutter/app.py `parse_timestamp`.
 */
export function parseTimecode(raw: string): number | null {
  const ts = raw.trim();
  if (!ts) return null;
  const parts = ts.split(":");
  if (parts.length < 1 || parts.length > 3) return null;

  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d+(\.\d+)?$/.test(p)) return null;
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0) return null;
    nums.push(n);
  }

  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

export function formatSeconds(s: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/*?:"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "clip";
}

export function clipFilename(title: string, start: number, end: number): string {
  const tag = `${formatSeconds(start)}-${formatSeconds(end)}`.replace(/:/g, ".");
  return `${sanitizeFilename(title)}_${tag}.mp3`;
}

export function contentDisposition(filename: string): string {
  const ascii =
    filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "clip.mp3";
  const encoded = encodeURIComponent(filename).replace(/['()]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
