import { Check, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import {
  OCHB_EVENT_ID,
  OCHB_TEAMS,
  listOchbParticipants,
  loadOchbTeams,
  ochbEventTeamChgkId,
  ochbRatingPublicUrl,
  type OchbTeam,
} from "@/lib/ochb";

async function teamsForPage(): Promise<OchbTeam[]> {
  if (process.env.DATABASE_URL) {
    try {
      const fromDb = await listOchbParticipants();
      if (fromDb.length >= OCHB_TEAMS.length) return fromDb;
    } catch {
      /* database down — the static list still renders */
    }
  }
  return loadOchbTeams();
}

/** A roster is submitted once TeamRoster exists (POST requires ≥1 player). */
async function loadRosterChgkIds(): Promise<Set<number>> {
  if (!process.env.DATABASE_URL) return new Set();
  try {
    const rosters = await db.teamRoster.findMany({
      where: { eventId: OCHB_EVENT_ID },
      select: { teamChgkId: true },
    });
    return new Set(
      rosters
        .map((r) => r.teamChgkId)
        .filter((id): id is number => id != null && id !== 0),
    );
  } catch {
    return new Set();
  }
}

export async function OchbParticipantsPage() {
  const [teams, rosterIds] = await Promise.all([teamsForPage(), loadRosterChgkIds()]);

  return (
    <div id="page-ochb-participants" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Всего команд: <strong>{teams.length}</strong>
        </p>
        <a
          href={ochbRatingPublicUrl()}
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
            Список команд пока пуст
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
                <th className="px-3 py-2.5 text-left font-medium">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((t) => {
                const hasRoster = rosterIds.has(ochbEventTeamChgkId(t));
                return (
                  <tr key={t.number} className="hover:bg-surface/50">
                    <td className="px-3 py-2.5 font-mono text-muted">{t.number}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                      {t.teamChgkId ? (
                        <a
                          href={`https://rating.chgk.info/teams/${t.teamChgkId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent hover:underline"
                        >
                          {t.name}
                        </a>
                      ) : (
                        t.name
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 text-center">
                      {hasRoster ? (
                        <span
                          className="inline-flex justify-center"
                          role="img"
                          title="Состав подан"
                          aria-label="Состав подан"
                        >
                          <Check className="h-4 w-4 text-green-600" aria-hidden />
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">{t.city}</td>
                    <td className="px-3 py-2.5 font-mono text-muted">
                      {t.teamChgkId ? (
                        <a
                          href={`https://rating.chgk.info/teams/${t.teamChgkId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {t.teamChgkId}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
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
