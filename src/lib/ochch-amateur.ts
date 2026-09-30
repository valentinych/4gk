import { db } from "./db";
import { OCHCH_EVENT_ID, OCHCH_TEAMS } from "./ochch";
import { getOchchStaffIds, isOchchSiteAdmin } from "./ochch-rating-staff";

const KNOWN_TEAM_IDS = new Set(OCHCH_TEAMS.map((t) => t.teamChgkId));

/** Site ADMIN, or rating.chgk.info orgcommittee for tournament 14219. */
export async function canToggleOchchAmateur(
  role: string | null | undefined,
  chgkId: number | null | undefined,
): Promise<boolean> {
  if (isOchchSiteAdmin(role)) return true;
  if (chgkId == null) return false;
  const ids = await getOchchStaffIds(["orgcommittee"]);
  return ids?.has(chgkId) ?? false;
}

export async function listOchchAmateurTeamIds(): Promise<Set<number>> {
  try {
    const rows = await db.ochchAmateurTeam.findMany({
      where: { eventId: OCHCH_EVENT_ID },
      select: { teamChgkId: true },
    });
    return new Set(rows.map((r) => r.teamChgkId));
  } catch {
    return new Set();
  }
}

export function isOchchKnownTeam(teamChgkId: number): boolean {
  return KNOWN_TEAM_IDS.has(teamChgkId);
}

export async function setOchchAmateurTeam(
  teamChgkId: number,
  amateur: boolean,
): Promise<boolean> {
  if (amateur) {
    await db.ochchAmateurTeam.upsert({
      where: {
        eventId_teamChgkId: { eventId: OCHCH_EVENT_ID, teamChgkId },
      },
      create: { eventId: OCHCH_EVENT_ID, teamChgkId },
      update: {},
    });
    return true;
  }
  await db.ochchAmateurTeam.deleteMany({
    where: { eventId: OCHCH_EVENT_ID, teamChgkId },
  });
  return false;
}
