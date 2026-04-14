import { fetchChgkGgRatings } from "./chgk-gg";

const SHEET_ID = "1muLzibrQamNZxNk-fA7gCvrLLXqzVhJXMT_f1UCZ_nU";

/**
 * Team IDs that participated in BOTH previous Dziki Sopot tournaments:
 * DS'24 (id=11247) and DS'25 (id=12462)
 * Fetched via: https://api.rating.chgk.info/tournaments/{id}/results.json
 */
const DS_BOTH_TEAMS = new Set([
  10, 56078, 56405, 60717, 63220, 77174, 85064, 86769, 87467, 87688,
  87884, 89616, 89632, 90063, 90965, 91851, 91852, 98470, 98974, 100058, 100059,
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
  // "Рейтинг" and "Участие в 2 ДС" are reassigned dynamically after live data arrives
  void f6;
  return { category: "none", label: "" };
}

export async function fetchDsParticipants(): Promise<DsParticipant[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
  const text = await fetch(url, { next: { revalidate: 300 } }).then((r) => {
    if (!r.ok) throw new Error(`Sheet fetch failed: ${r.status}`);
    return r.text();
  });

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const rawParticipants: Omit<DsParticipant, "ratingPosition" | "ratingScore" | "inBothDs">[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const team = cells[1]?.trim().replace(/^"|"$/g, "");
    if (!team) continue;

    const teamId = parseInt(cells[3] ?? "0") || 0;
    const rawRating = parseInt(cells[4] ?? "0") || 0;
    const rating = rawRating === 0 || rawRating === 9999 ? null : rawRating;
    const { category, label } = parseCategory(cells[5] ?? "", cells[6] ?? "");

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

  // Fetch current ratings from rating.chgk.gg in parallel
  const teamIds = rawParticipants.map((p) => p.teamId);
  const ratingsMap = await fetchChgkGgRatings(teamIds);

  const withLive = rawParticipants.map((p) => {
    const live = ratingsMap.get(p.teamId) ?? null;
    return {
      ...p,
      ratingPosition: live?.position ?? null,
      ratingScore: live?.score ?? null,
      inBothDs: DS_BOTH_TEAMS.has(p.teamId),
    };
  });

  // Confirmed slots: "time" and "vk" keep their order and category
  const confirmed = withLive.filter((p) => p.category === "time" || p.category === "vk");

  // Remaining teams sorted by current rating position (null → end), then by rating score desc
  const rest = withLive
    .filter((p) => p.category !== "time" && p.category !== "vk")
    .sort((a, b) => {
      const posA = a.ratingPosition ?? Infinity;
      const posB = b.ratingPosition ?? Infinity;
      if (posA !== posB) return posA - posB;
      // Fallback: higher score first
      const scoreA = a.ratingScore ?? a.rating ?? 0;
      const scoreB = b.ratingScore ?? b.rating ?? 0;
      return scoreB - scoreA;
    });

  // Top 15 of rest get "Рейтинг N" label; the rest get "none"
  const ranked = rest.map((p, i) => {
    if (i < 15) {
      return { ...p, category: "rating" as ParticipantCategory, categoryLabel: `Рейтинг ${i + 1}` };
    }
    return { ...p, category: "none" as ParticipantCategory, categoryLabel: "" };
  });

  return [...confirmed, ...ranked];
}
