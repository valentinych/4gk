import { ExternalLink } from "lucide-react";
import {
  OCHB_TEAMS,
  listOchbParticipants,
  loadOchbTeams,
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

export async function OchbParticipantsPage() {
  const teams = await teamsForPage();

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
                <th className="px-3 py-2.5 text-left font-medium">Город</th>
                <th className="px-3 py-2.5 text-left font-medium">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((t) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
