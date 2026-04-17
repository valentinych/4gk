export interface ChgkGgRating {
  position: number;
  score: number;
  /** Release date in DD.MM.YYYY format, e.g. "16.04.2026" */
  releaseDate: string;
}

/**
 * Fetches the current rating position and score for a team from rating.chgk.gg.
 * Parses the first non-empty row of the team's release history table.
 *
 * Example URL: https://rating.chgk.gg/b/team/65510/
 * Returns { position: 32, score: 13274 } for the latest release.
 */
export async function fetchChgkGgRating(
  teamId: number,
): Promise<ChgkGgRating | null> {
  if (!teamId || teamId <= 0) return null;

  try {
    const res = await fetch(`https://rating.chgk.gg/b/team/${teamId}/`, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "4gk.pl/1.0 (+https://4gk.pl)" },
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Find all <tr class="...rating-table-row..."> rows
    const rowRegex =
      /<tr[^>]*class="[^"]*rating-table-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let match: RegExpExecArray | null;

    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      // Extract <td> cells
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const cells: string[] = [];
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        // Strip all HTML tags and trim
        const text = cellMatch[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .trim();
        cells.push(text);
      }

      // A valid release row has: [date, position, rating, ...]
      // date looks like "DD.MM.YYYY", position is a number, rating is a number
      if (cells.length >= 3) {
        const dateStr = cells[0];
        const posStr = cells[1].split(/\s/)[0]; // first token (ignore sub-rows)
        const scoreStr = cells[2].split(/\s/)[0]; // first token (ignore +/- change)

        const isDate = /^\d{2}\.\d{2}\.\d{4}$/.test(dateStr);
        const pos = parseInt(posStr);
        const score = parseInt(scoreStr);

        if (isDate && !isNaN(pos) && pos > 0 && !isNaN(score) && score > 0) {
          return { position: pos, score, releaseDate: dateStr };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export interface ChgkGgRatingsResult {
  map: Map<number, ChgkGgRating | null>;
  /** Most recent release date found across all teams, DD.MM.YYYY, or null */
  releaseDate: string | null;
}

/**
 * Fetches ratings for multiple teams in parallel.
 * Returns a map of teamId → ChgkGgRating and the most recent release date.
 */
export async function fetchChgkGgRatings(
  teamIds: number[],
): Promise<ChgkGgRatingsResult> {
  const unique = [...new Set(teamIds.filter((id) => id > 0))];
  const results = await Promise.all(
    unique.map(async (id) => ({ id, rating: await fetchChgkGgRating(id) })),
  );
  const map = new Map<number, ChgkGgRating | null>();
  let releaseDate: string | null = null;

  for (const { id, rating } of results) {
    map.set(id, rating);
    if (rating?.releaseDate) {
      // Keep the most recent date (DD.MM.YYYY → compare as YYYY-MM-DD)
      const candidate = toIso(rating.releaseDate);
      if (!releaseDate || candidate > toIso(releaseDate)) {
        releaseDate = rating.releaseDate;
      }
    }
  }

  return { map, releaseDate };
}

/** Convert DD.MM.YYYY to YYYY-MM-DD for lexicographic date comparison */
function toIso(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split(".");
  return `${y}-${m}-${d}`;
}
