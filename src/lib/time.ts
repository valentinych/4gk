/**
 * All user-facing times on 4gk.pl are displayed in the Europe/Warsaw
 * timezone, regardless of the viewer's locale. Admin datetime-local
 * inputs are likewise treated as Warsaw wall-clock time.
 */
export const WARSAW_TZ = "Europe/Warsaw";

function partsInWarsaw(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WARSAW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const out: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
  return out;
}

/** "DD.MM.YYYY, HH:MM" in Warsaw timezone */
export function formatWarsawDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = partsInWarsaw(d);
  return `${p.day}.${p.month}.${p.year}, ${p.hour}:${p.minute}`;
}

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** "D MMMM HH:MM" in Warsaw timezone (e.g. "21 апреля 18:40") */
export function formatWarsawShort(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = partsInWarsaw(d);
  const day = Number(p.day);
  return `${day} ${MONTHS_GEN[Number(p.month) - 1]} ${p.hour}:${p.minute}`;
}

/**
 * Convert a stored UTC ISO string to a "YYYY-MM-DDTHH:MM" value usable
 * by <input type="datetime-local">, expressed as Warsaw wall-clock time.
 */
export function isoToWarsawInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = partsInWarsaw(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Interpret a <input type="datetime-local"> value ("YYYY-MM-DDTHH:MM")
 * as Warsaw wall-clock time and return the corresponding UTC ISO
 * instant for persistence.
 */
export function warsawInputValueToIso(local: string | null | undefined): string | null {
  if (!local) return null;
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5], s = m[6] ? +m[6] : 0;

  const naiveUtcMs = Date.UTC(y, mo - 1, d, h, mi, s);
  const naiveDate = new Date(naiveUtcMs);
  const p = partsInWarsaw(naiveDate);
  const warsawShownMs = Date.UTC(
    +p.year, +p.month - 1, +p.day, +p.hour, +p.minute,
  );
  // The difference is the Warsaw UTC offset at that instant.
  const offsetMs = warsawShownMs - naiveUtcMs;
  return new Date(naiveUtcMs - offsetMs).toISOString();
}
