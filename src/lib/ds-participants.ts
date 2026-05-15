import { unstable_noStore as noStore } from "next/cache";
import { fetchChgkGgRatings } from "./chgk-gg";

const SHEET_ID = "1muLzibrQamNZxNk-fA7gCvrLLXqzVhJXMT_f1UCZ_nU";

/**
 * Final rating release used for slot allocation. Frozen — rating is no longer
 * recomputed against newer releases. Any registrations submitted after this
 * date are still evaluated against the 14.05.2026 rating snapshot.
 */
const RATING_LOCK_DATE = "14.05.2026";

// Slot quotas for confirmed participation.
const TIME_SLOTS = 10;
const VK_SLOTS = 7;
const RATING_SLOTS = 15;
const DS2_SLOTS = 10;

/**
 * Team IDs that participated in BOTH previous Dziki Sopot tournaments:
 * DS'24 (id=11247) and DS'25 (id=12462)
 * Fetched via: https://api.rating.chgk.info/tournaments/{id}/results.json
 */
const DS_BOTH_TEAMS = new Set([
  10, 56078, 56405, 60717, 63220, 77174, 85064, 86769, 87467, 87688,
  87884, 89616, 89632, 90063, 90965, 91851, 91852, 98470, 98974, 100058, 100059,
  101287, // hardfix: Цифра 3 — participated in both DS
  62709,  // hardfix: Есть желающие — participated in both DS
]);

/**
 * Teams invited by organizers (ВК) that aren't yet flagged as such in the
 * Google Sheet — overrides the sheet category for these team IDs.
 */
const VK_OVERRIDE_TEAMS = new Set<number>([
  102668, // Прокрастинация
  54152,  // Пражские горцы
]);

export type ParticipantCategory = "time" | "vk" | "rating" | "ds2" | "none";

export interface DsParticipant {
  team: string;
  city: string;
  teamId: number;
  /** Rating position from Google Sheet (used as fallback) */
  rating: number | null;
  /** Current rating position from rating.chgk.gg */
  ratingPosition: number | null;
  /** Current rating score (points) from rating.chgk.gg */
  ratingScore: number | null;
  category: ParticipantCategory;
  categoryLabel: string;
  notes: string;
  /** Raw timestamp string from sheet, e.g. "22.03.2026 13:06:04" */
  registeredAt: string;
  /** True if team played in both previous Dziki Sopot tournaments */
  inBothDs: boolean;
  /** True if team is on the waiting list (did not get a confirmed slot) */
  inWaitlist: boolean;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === "," && !inQ) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCategory(
  col5: string,
  col6: string,
): { category: ParticipantCategory; label: string } {
  const f5 = col5.trim();
  const f6 = col6.trim();

  if (f5.startsWith("Время"))   return { category: "time", label: f5 };
  if (f5 === "ВК")              return { category: "vk",   label: "ВК" };
  // "Рейтинг" and "Участие в 2 DS" are reassigned dynamically after live data arrives
  void f6;
  return { category: "none", label: "" };
}

export interface DsParticipantsResult {
  participants: DsParticipant[];
  /** Most recent rating release date, e.g. "16.04.2026", or null */
  ratingReleaseDate: string | null;
}

export async function fetchDsParticipants(): Promise<DsParticipantsResult> {
  noStore();
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
  const text = await fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Sheet fetch failed: ${r.status}`);
    return r.text();
  });

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const rawParticipants: Omit<DsParticipant, "ratingPosition" | "ratingScore" | "inBothDs" | "inWaitlist">[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const team = cells[1]?.trim().replace(/^"|"$/g, "");
    if (!team) continue;

    const teamId = parseInt(cells[3] ?? "0") || 0;
    const rawRating = parseInt(cells[4] ?? "0") || 0;
    const rating = rawRating === 0 || rawRating === 9999 ? null : rawRating;
    let { category, label } = parseCategory(cells[5] ?? "", cells[6] ?? "");
    if (VK_OVERRIDE_TEAMS.has(teamId)) {
      category = "vk";
      label = "ВК";
    }

    rawParticipants.push({
      team,
      city: cells[2]?.trim().replace(/^"|"$/g, "") ?? "",
      teamId,
      rating,
      category,
      categoryLabel: label,
      notes: cells[7]?.trim() ?? "",
      registeredAt: cells[0]?.trim() ?? "",
    });
  }

  // Fetch ratings from rating.chgk.gg pinned to the lock date
  const teamIds = rawParticipants.map((p) => p.teamId);
  const { map: ratingsMap, releaseDate: ratingReleaseDate } = await fetchChgkGgRatings(
    teamIds,
    RATING_LOCK_DATE,
  );

  const withLive = rawParticipants.map((p) => {
    const live = ratingsMap.get(p.teamId) ?? null;
    return {
      ...p,
      ratingPosition: live?.position ?? null,
      ratingScore: live?.score ?? null,
      inBothDs: DS_BOTH_TEAMS.has(p.teamId),
      inWaitlist: false,
    };
  });

  // Time slots: keep first TIME_SLOTS teams flagged "Время" in sheet order.
  const timeTeams = withLive.filter((p) => p.category === "time").slice(0, TIME_SLOTS);

  // VK slots: keep first VK_SLOTS teams flagged "ВК" in sheet order.
  const vkTeams = withLive.filter((p) => p.category === "vk").slice(0, VK_SLOTS);

  const reservedIds = new Set([...timeTeams, ...vkTeams].map((p) => p.teamId));

  // Remaining teams sorted by rating position (lower is better; missing → end),
  // then by score desc as tiebreaker.
  const sortByRating = (
    a: (typeof withLive)[number],
    b: (typeof withLive)[number],
  ) => {
    const posA = a.ratingPosition ?? a.rating ?? Infinity;
    const posB = b.ratingPosition ?? b.rating ?? Infinity;
    if (posA !== posB) return posA - posB;
    return (b.ratingScore ?? 0) - (a.ratingScore ?? 0);
  };

  const rest = withLive
    .filter((p) => !reservedIds.has(p.teamId))
    .sort(sortByRating);

  // Top RATING_SLOTS by rating get "rating" category.
  const ratingTeams = rest.slice(0, RATING_SLOTS).map((p, i) => ({
    ...p,
    category: "rating" as ParticipantCategory,
    categoryLabel: `Рейтинг ${i + 1}`,
  }));

  // From the remainder, take up to DS2_SLOTS inBothDs teams (already sorted by rating).
  const afterRating = rest.slice(RATING_SLOTS);
  const ds2Picked = afterRating.filter((p) => p.inBothDs).slice(0, DS2_SLOTS);
  const ds2Ids = new Set(ds2Picked.map((p) => p.teamId));
  const ds2Teams = ds2Picked.map((p) => ({
    ...p,
    category: "ds2" as ParticipantCategory,
    categoryLabel: "Участие в 2 DS",
  }));

  // Everyone else → waitlist, sorted by rating.
  const waitlistTeams = afterRating
    .filter((p) => !ds2Ids.has(p.teamId))
    .map((p) => ({
      ...p,
      category: "none" as ParticipantCategory,
      categoryLabel: "",
      inWaitlist: true,
    }));

  return {
    participants: [...timeTeams, ...vkTeams, ...ratingTeams, ...ds2Teams, ...waitlistTeams],
    ratingReleaseDate,
  };
}
