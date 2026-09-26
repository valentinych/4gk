import { ExternalLink } from "lucide-react";
import { ratingChgkResultsQuery } from "@/lib/chgk-tournament-results";
import {
  OCHCH_RATING_TOURNAMENT_ID,
  ochchRatingPublicUrl,
} from "@/lib/ochch";

interface RatingResultRow {
  current: { name: string; town: { name: string } };
  position: number;
}

function sortByNameRu<T extends { name: string }>(rows: T[]): T[] {
  const key = (s: string) => s.toLocaleLowerCase("ru");
  return [...rows].sort((a, b) => key(a.name).localeCompare(key(b.name), "ru"));
}

export async function OchchParticipantsPage() {
  const res = await fetch(
    `https://api.rating.chgk.info/tournaments/${OCHCH_RATING_TOURNAMENT_ID}/results?${ratingChgkResultsQuery(0)}`,
    { next: { revalidate: 3600 } },
  );
  const results: RatingResultRow[] = res.ok ? await res.json() : [];
  const teams = sortByNameRu(
    results
      .filter((a) => a.position !== 9999)
      .map((a) => ({ name: a.current.name, city: a.current.town.name })),
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
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="w-10 px-3 py-2.5 text-left font-medium">№</th>
                <th className="px-3 py-2.5 text-left font-medium">Команда</th>
                <th className="px-3 py-2.5 text-left font-medium">Город</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((t, i) => (
                <tr key={`${t.name}\0${t.city}`} className="hover:bg-surface/50">
                  <td className="px-3 py-2.5 font-mono text-muted">{i + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{t.name}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{t.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
