import { db } from "@/lib/db";

/**
 * Allocate a synthetic negative teamChgkId for manual entries (teams not yet on
 * rating.chgk.info). Required because EventTeam has @@unique([eventId, teamChgkId]).
 */
export async function allocateManualTeamChgkId(eventId: string): Promise<number> {
  const min = await db.eventTeam.aggregate({
    where: { eventId },
    _min: { teamChgkId: true },
  });
  const current = min._min.teamChgkId ?? 0;
  return Math.min(current, 0) - 1;
}
