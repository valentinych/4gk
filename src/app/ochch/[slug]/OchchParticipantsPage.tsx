import { CheckCircle2, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import {
  OCHCH_EVENT_ID,
  OCHCH_TEAMS,
  listOchchParticipants,
  ochchInviteFor,
  ochchRatingPublicUrl,
  type OchchImportedTeam,
} from "@/lib/ochch";

function sortByNumber(rows: OchchImportedTeam[]): OchchImportedTeam[] {
  return [...rows].sort((a, b) => a.number - b.number || a.name.localeCompare(b.name, "ru"));
}

/** A roster is submitted once TeamRoster exists for the team (POST requires ≥1 player). */
async function loadRosterChgkIds(): Promise<Set<number>> {
  try {
    const rosters = await db.teamRoster.findMany({
      where: { eventId: OCHCH_EVENT_ID },
      select: { teamChgkId: true },
    });
    return new Set(
      rosters
        .map((r) => r.teamChgkId)
        .filter((id): id is number => id != null && id > 0),
    );
  } catch {
    return new Set();
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

  const rosterChgkIds = await loadRosterChgkIds();

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
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="w-10 px-3 py-2.5 text-left font-medium">№</th>
                <th className="px-3 py-2.5 text-left font-medium">Команда</th>
                <th
                  className="w-14 px-1.5 py-2.5 text-center font-medium"
                  title="Подан состав"
                >
                  Состав
                </th>
                <th className="px-3 py-2.5 text-left font-medium">Город</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((t) => {
                const invite = ochchInviteFor(t);
                const hasRoster = rosterChgkIds.has(t.teamChgkId);
                return (
                  <tr key={t.teamChgkId} className="hover:bg-surface/50">
                    <td className="px-3 py-2.5 font-mono text-muted">{t.number}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                      {invite.czech ? (
                        <span title="Чешская команда" className="mr-1">
                          🇨🇿
                        </span>
                      ) : null}
                      {t.name}
                    </td>
                    <td className="px-1.5 py-2.5 text-center">
                      {hasRoster ? (
                        <span
                          className="inline-flex justify-center"
                          role="img"
                          title="Состав подан"
                          aria-label="Состав подан"
                        >
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-500"
                            aria-hidden
                          />
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">{t.city}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
