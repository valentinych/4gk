import { NextResponse } from "next/server";

const SHEET_ID = "1muLzibrQamNZxNk-fA7gCvrLLXqzVhJXMT_f1UCZ_nU";

export type ParticipantCategory = "time" | "vk" | "rating" | "ds2" | "none";

export interface DsParticipant {
  team: string;
  city: string;
  teamId: number;
  rating: number | null; // null = unranked (was 9999 in sheet)
  category: ParticipantCategory;
  categoryLabel: string; // "Время 3", "ВК", "Рейтинг 5", "Участие в 2 ДС", ""
  notes: string;
}

// ─── Robust CSV parser (handles quoted fields with commas) ───────────────────

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

// ─── Category detection ──────────────────────────────────────────────────────

function parseCategory(
  col5: string,
  col6: string,
): { category: ParticipantCategory; label: string } {
  const f5 = col5.trim();
  const f6 = col6.trim();

  if (f5.startsWith("Время"))        return { category: "time",   label: f5 };
  if (f5 === "ВК")                   return { category: "vk",    label: "ВК" };
  if (f5 === "Участие в 2 ДС")       return { category: "ds2",   label: "Участие в 2 ДС" };
  if (f6.startsWith("Рейтинг"))      return { category: "rating", label: f6 };
  return { category: "none", label: "" };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
    const text = await fetch(url, { next: { revalidate: 300 } }).then((r) => r.text());

    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const participants: DsParticipant[] = [];

    for (let i = 1; i < lines.length; i++) { // skip header
      const cells = parseCsvLine(lines[i]);
      const team = cells[1]?.trim().replace(/^"|"$/g, "");
      if (!team) continue;

      const teamId = parseInt(cells[3] ?? "0") || 0;
      const rawRating = parseInt(cells[4] ?? "0") || 0;
      const rating = rawRating === 0 || rawRating === 9999 ? null : rawRating;
      const { category, label } = parseCategory(cells[5] ?? "", cells[6] ?? "");
      const notes = cells[7]?.trim() ?? "";

      participants.push({
        team,
        city: cells[2]?.trim().replace(/^"|"$/g, "") ?? "",
        teamId,
        rating,
        category,
        categoryLabel: label,
        notes,
      });
    }

    return NextResponse.json({ participants });
  } catch (err) {
    console.error("[DS participants]", err);
    return NextResponse.json({ participants: [] });
  }
}
