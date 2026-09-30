import { ExternalLink } from "lucide-react";
import { getServerSession } from "next-auth";
import { OchchParticipantsTable } from "./OchchParticipantsTable";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canToggleOchchAmateur, listOchchAmateurTeamIds } from "@/lib/ochch-amateur";
import {
  OCHCH_EVENT_ID,
  OCHCH_TEAMS,
  listOchchParticipants,
  ochchRatingPublicUrl,
  type OchchImportedTeam,
} from "@/lib/ochch";

function sortByNumber(rows: OchchImportedTeam[]): OchchImportedTeam[] {
  return [...rows].sort((a, b) => a.number - b.number || a.name.localeCompare(b.name, "ru"));
}

/** A roster is submitted once TeamRoster exists for the team (POST requires ≥1 player). */
async function loadRosterChgkIds(): Promise<number[]> {
  try {
    const rosters = await db.teamRoster.findMany({
      where: { eventId: OCHCH_EVENT_ID },
      select: { teamChgkId: true },
    });
    return rosters
      .map((r) => r.teamChgkId)
      .filter((id): id is number => id != null && id > 0);
  } catch {
    return [];
  }
}

export async function OchchParticipantsPage() {
  let teams: OchchImportedTeam[] = [];
  try {
    const fromDb = await listOchchParticipants();
    teams = sortByNumber(fromDb.length > 0 ? fromDb : [...OCHCH_TEAMS]);
  } catch {
    teams = sortByNumber([...OCHCH_TEAMS]);
  }

  const [rosterChgkIds, amateurChgkIds, session] = await Promise.all([
    loadRosterChgkIds(),
    listOchchAmateurTeamIds(),
    getServerSession(authOptions),
  ]);
  const canToggle = await canToggleOchchAmateur(
    session?.user?.role,
    session?.user?.chgkId,
  );

  return (
    <div id="page-ochch-participants" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Всего команд: <strong>{teams.length}</strong>
        </p>
        <a
          href={ochchRatingPublicUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          rating.chgk.info <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">
            Список появится, когда команды будут в рейтинге
          </p>
        </div>
      ) : (
        <OchchParticipantsTable
          teams={teams}
          rosterChgkIds={rosterChgkIds}
          amateurChgkIds={[...amateurChgkIds]}
          canToggleAmateur={canToggle}
        />
      )}
    </div>
  );
}
