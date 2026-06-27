import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  fetchOchpAllSeasonStats,
  ochpSeasonRatingUrl,
} from "@/lib/ochp-stats";

export default async function OchpStatsTable() {
  const rows = await fetchOchpAllSeasonStats();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        Сводка по сезонам Открытого чемпионата Польши: победители общего и
        польского зачётов ЧГК, число команд и ссылки на результаты.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5 text-left font-medium">Сезон</th>
              <th className="px-3 py-2.5 text-left font-medium">Даты</th>
              <th className="px-3 py-2.5 text-center font-medium w-14">Ком.</th>
              <th className="px-3 py-2.5 text-left font-medium">
                Общий зачёт ЧГК
              </th>
              <th className="px-3 py-2.5 text-left font-medium">
                Польский зачёт ЧГК
              </th>
              <th className="px-3 py-2.5 text-right font-medium w-24">
                Результаты
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => (
              <tr key={row.seasonStart} className="hover:bg-surface/50">
                <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                  {row.label}
                  <span className="ml-1.5 text-xs font-normal text-muted">
                    ({row.championshipYear})
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted whitespace-nowrap">
                  {!row.held
                    ? "не проводился"
                    : row.dateLabel ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-center font-mono tabular-nums">
                  {!row.held ? "—" : (row.teamCount ?? "—")}
                </td>
                <td className="px-3 py-2.5">
                  {!row.held || !row.overallWinner ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <div>
                      <span className="font-medium">
                        {row.overallWinner.name}
                      </span>
                      <span className="text-xs text-muted">
                        {" "}
                        · {row.overallWinner.city} · {row.overallWinner.score}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {!row.held || !row.polishWinner ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <div>
                      <span className="font-medium">
                        {row.polishWinner.name}
                      </span>
                      <span className="text-xs text-muted">
                        {" "}
                        · {row.polishWinner.city} · {row.polishWinner.score}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  {!row.held ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      {row.resultsHref && (
                        <Link
                          href={row.resultsHref}
                          className="text-xs text-accent hover:underline"
                        >
                          на портале
                        </Link>
                      )}
                      {row.tournamentId != null && (
                        <a
                          href={ochpSeasonRatingUrl(row.tournamentId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          рейтинг
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
