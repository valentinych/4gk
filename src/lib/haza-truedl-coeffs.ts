import { fetchChgkGgRatings } from "@/lib/chgk-gg";
import { db } from "@/lib/db";
import {
  fetchDsParticipantsForDisplay,
  normTeamName,
  participantShownName,
} from "@/lib/ds-participants-display";
import { DS_MAIN_EVENT_ID } from "@/lib/dziki-sopot-seasons";
import {
  DS_HAZA_WIDGET_PATH,
  DS_HAZA_WIDGET_URL,
  PAGE_WIDGET_HAZA,
  hazaBroadcastUrl,
  parseHazaBroadcastId,
} from "@/lib/page-widgets";
import { trueDlCoeffFromMakPlace, TRUEDL_COEFF_BASELINE } from "@/lib/truedl";

const COEFF_TTL_MS = 15 * 60 * 1000;

let coeffCache: { at: number; byNormName: Map<string, number> } | null = null;
let coeffInflight: Promise<Map<string, number>> | null = null;

function rememberName(map: Map<string, number>, raw: string | null | undefined, teamId: number) {
  if (!raw || teamId <= 0) return;
  const key = normTeamName(raw);
  if (key && !map.has(key)) map.set(key, teamId);
}

async function loadDsNameToTeamId(): Promise<Map<string, number>> {
  const idByName = new Map<string, number>();
  try {
    const { participants } = await fetchDsParticipantsForDisplay();
    for (const p of participants) {
      rememberName(idByName, p.displayName, p.teamId);
      rememberName(idByName, participantShownName(p), p.teamId);
      rememberName(idByName, p.officialName, p.teamId);
      rememberName(idByName, p.team, p.teamId);
    }
  } catch (e) {
    console.error("haza trueDL: DS participants mapping failed", e);
  }

  try {
    const eventTeams = await db.eventTeam.findMany({
      where: { eventId: DS_MAIN_EVENT_ID, withdrawnAt: null },
      select: { teamChgkId: true, teamName: true, displayName: true },
    });
    for (const t of eventTeams) {
      rememberName(idByName, t.displayName, t.teamChgkId);
      rememberName(idByName, t.teamName, t.teamChgkId);
    }
  } catch (e) {
    console.error("haza trueDL: EventTeam mapping failed", e);
  }

  return idByName;
}

async function loadDsCoeffByNormName(): Promise<Map<string, number>> {
  const now = Date.now();
  if (coeffCache && now - coeffCache.at < COEFF_TTL_MS) {
    return coeffCache.byNormName;
  }
  if (coeffInflight) return coeffInflight;

  coeffInflight = (async () => {
    const idByName = await loadDsNameToTeamId();
    const ids = [...new Set(idByName.values())];
    const { map: places } =
      ids.length > 0 ? await fetchChgkGgRatings(ids) : { map: new Map() };
    const byNormName = new Map<string, number>();
    for (const [name, teamId] of idByName) {
      byNormName.set(name, trueDlCoeffFromMakPlace(places.get(teamId)?.position ?? null));
    }
    coeffCache = { at: Date.now(), byNormName };
    return byNormName;
  })().finally(() => {
    coeffInflight = null;
  });

  return coeffInflight;
}

export async function isDsHazaBroadcast(broadcastId: number): Promise<boolean> {
  const dsId = parseHazaBroadcastId(DS_HAZA_WIDGET_URL);
  if (dsId != null && broadcastId === dsId) return true;
  const hit = await db.pageWidget.findFirst({
    where: {
      type: PAGE_WIDGET_HAZA,
      url: hazaBroadcastUrl(broadcastId),
      path: DS_HAZA_WIDGET_PATH,
    },
    select: { id: true },
  });
  return hit != null;
}

export async function loadDsHazaTrueDlCoeffs(): Promise<Map<string, number>> {
  return loadDsCoeffByNormName();
}

export function applyHazaTrueDlCoeffs<T extends { name: string }>(
  teams: T[],
  byNormName: Map<string, number>,
): Array<T & { coeff: number }> {
  return teams.map((t) => ({
    ...t,
    coeff: byNormName.get(normTeamName(t.name)) ?? TRUEDL_COEFF_BASELINE,
  }));
}
