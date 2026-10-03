/**
 * OCHCH trueDL C from each team's MAK rating place.
 * Team ids come from api.rating.chgk.info tournament 14219.
 * Places come from rating.chgk.gg (the tournament's ratingSystems value).
 * The release dated after the tournament start already lists ОЧЧ-2026, so C
 * uses the latest release on or before dateStart — same bands as Haza/DS.
 */

import { fetchChgkGgRatings } from "@/lib/chgk-gg";
import { OCHCH, OCHCH_RATING_TOURNAMENT_ID } from "@/lib/ochch";
import type { PraguePayload } from "@/lib/prague-stats";
import { trueDlCoeffFromMakPlace } from "@/lib/truedl";

const COEFF_TTL_MS = 15 * 60 * 1000;
const RATING_API = "https://api.rating.chgk.info";

export type OchchTrueDlCoeffLoad = {
  /** teamChgkId → MAK band C, only when a place was found. */
  byTeamId: Map<number, number>;
  /** Ids returned by tournament 14219 results (lookup was attempted). */
  lookedUp: Set<number>;
  source: string;
};

type Cache = { at: number; load: OchchTrueDlCoeffLoad };

const store = globalThis as typeof globalThis & {
  __ochchTrueDlCoeffs?: Cache;
  __ochchTrueDlCoeffsInflight?: Promise<OchchTrueDlCoeffLoad | null>;
};

function ddmmyyyyUtc(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function targetDateFromIso(iso: unknown): string | null {
  if (typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function teamIdsFromResults(data: unknown): number[] {
  if (!Array.isArray(data)) return [];
  const ids: number[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const team = (row as { team?: { id?: unknown } }).team;
    const id = team?.id;
    if (typeof id === "number" && Number.isInteger(id) && id > 0) ids.push(id);
  }
  return [...new Set(ids)];
}

async function fetchOchchTrueDlCoeffs(): Promise<OchchTrueDlCoeffLoad | null> {
  const tournamentId = OCHCH_RATING_TOURNAMENT_ID;
  const headers = { Accept: "application/json" };
  let tournament: unknown;
  let results: unknown;
  try {
    const [tRes, rRes] = await Promise.all([
      fetch(`${RATING_API}/tournaments/${tournamentId}`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${RATING_API}/tournaments/${tournamentId}/results`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }),
    ]);
    if (!tRes.ok || !rRes.ok) return null;
    tournament = await tRes.json();
    results = await rRes.json();
  } catch (e) {
    console.error("OCHCH trueDL: tournament 14219 fetch failed", e);
    return null;
  }

  const ids = teamIdsFromResults(results);
  if (ids.length === 0) return null;

  const dateStart =
    tournament && typeof tournament === "object"
      ? (tournament as { dateStart?: unknown }).dateStart
      : undefined;
  const cap = targetDateFromIso(dateStart) ?? ddmmyyyyUtc(OCHCH.startDate);

  const { map, releaseDate } = await fetchChgkGgRatings(ids, cap);
  const byTeamId = new Map<number, number>();
  let missing = 0;
  for (const id of ids) {
    const place = map.get(id)?.position;
    if (place == null) {
      missing += 1;
      continue;
    }
    byTeamId.set(id, trueDlCoeffFromMakPlace(place));
  }

  const source = `rating.chgk.gg MAK place, release ≤ ${cap} (tournament ${tournamentId} dateStart${
    releaseDate ? `, latest used ${releaseDate}` : ""
  }); ${byTeamId.size}/${ids.length} teams; ${missing} without a place skipped`;

  return { byTeamId, lookedUp: new Set(ids), source };
}

/** Cached like the 14219 staff lists. Stale lists if a refresh fails. */
export async function loadOchchTrueDlCoeffs(): Promise<OchchTrueDlCoeffLoad | null> {
  const cached = store.__ochchTrueDlCoeffs;
  if (cached && Date.now() - cached.at < COEFF_TTL_MS) return cached.load;
  if (store.__ochchTrueDlCoeffsInflight) return store.__ochchTrueDlCoeffsInflight;

  const inflight = (async () => {
    const fresh = await fetchOchchTrueDlCoeffs();
    if (fresh) {
      store.__ochchTrueDlCoeffs = { at: Date.now(), load: fresh };
      console.info("OCHCH trueDL C", fresh.source);
      return fresh;
    }
    if (cached) {
      console.info("OCHCH trueDL C stale", cached.load.source);
      return cached.load;
    }
    console.info("OCHCH trueDL C unavailable");
    return null;
  })().finally(() => {
    store.__ochchTrueDlCoeffsInflight = undefined;
  });

  store.__ochchTrueDlCoeffsInflight = inflight;
  return inflight;
}

/**
 * Sets `coeff` on board rows. Teams with no MAK place get `null` (left out of
 * the trueDL average). Median and mean are unchanged.
 */
export async function withOchchTrueDlCoeffs(
  payload: PraguePayload,
): Promise<PraguePayload> {
  const load = await loadOchchTrueDlCoeffs();
  const teams = payload.teams.map((team) => {
    const id = team.teamChgkId;
    if (!load || id == null || !load.lookedUp.has(id)) {
      return { ...team, coeff: null };
    }
    return { ...team, coeff: load.byTeamId.get(id) ?? null };
  });
  return {
    ...payload,
    teams,
    trueDlCoeffSource: load?.source ?? "unavailable",
  };
}
