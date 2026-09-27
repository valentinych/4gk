import { ExternalLink } from "lucide-react";
import {
  OCHCH_TEAMS,
  listOchchParticipants,
  ochchInviteFor,
  ochchRatingPublicUrl,
  type OchchImportedTeam,
} from "@/lib/ochch";

function sortByNameRu(rows: OchchImportedTeam[]): OchchImportedTeam[] {
  const key = (s: string) => s.toLocaleLowerCase("ru");
  return [...rows].sort((a, b) => key(a.name).localeCompare(key(b.name), "ru"));
}

export async function OchchParticipantsPage() {
  let teams: OchchImportedTeam[] = [];
  try {
    const fromDb = await listOchchParticipants();
    teams = sortByNameRu(fromDb.length > 0 ? fromDb : [...OCHCH_TEAMS]);
  } catch {
    teams = sortByNameRu([...OCHCH_TEAMS]);
  }

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
                <th className="px-3 py-2.5 text-left font-medium">Город</th>
                <th className="px-3 py-2.5 text-left font-medium">Критерий</th>
                <th className="px-3 py-2.5 text-left font-medium">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((t) => {
                const invite = ochchInviteFor(t);
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
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">{t.city}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                      {invite.criterion ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted">
                      <a
                        href={`https://rating.chgk.info/teams/${t.teamChgkId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {t.teamChgkId}
                      </a>
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
