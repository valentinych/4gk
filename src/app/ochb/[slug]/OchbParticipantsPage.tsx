import { ExternalLink } from "lucide-react";
import { fetchOchbParticipants, ochbRatingPublicUrl } from "@/lib/ochb";

export async function OchbParticipantsPage() {
  const result = await fetchOchbParticipants();

  return (
    <div id="page-ochb-participants" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {result.ok ? (
          <p className="text-sm text-muted">
            Всего команд: <strong>{result.teams.length}</strong>
          </p>
        ) : (
          <p className="text-sm text-muted">Список с rating.chgk.info</p>
        )}
        <a
          href={ochbRatingPublicUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          rating.chgk.info <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {!result.ok ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">
            Список команд не удалось загрузить
          </p>
        </div>
      ) : result.teams.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">
            На rating.chgk.info пока нет заявленных команд
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
              {result.teams.map((t) => (
                <tr key={t.teamChgkId} className="hover:bg-surface/50">
                  <td className="px-3 py-2.5 font-mono text-muted">{t.number}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                    <a
                      href={`https://rating.chgk.info/teams/${t.teamChgkId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent hover:underline"
                    >
                      {t.name}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{t.city}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
