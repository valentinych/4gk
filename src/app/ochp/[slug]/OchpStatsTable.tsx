import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  fetchOchpStatsPageData,
  ochpSeasonRatingUrl,
  type OchpPlayerPodiumRow,
  type OchpTeamPodiumRow,
} from "@/lib/ochp-stats";

function MedalCells({
  gold,
  silver,
  bronze,
}: {
  gold: number;
  silver: number;
  bronze: number;
}) {
  return (
    <>
      <td className="px-3 py-2.5 text-center font-mono tabular-nums">
        {gold || <span className="text-muted/40">—</span>}
      </td>
      <td className="px-3 py-2.5 text-center font-mono tabular-nums">
        {silver || <span className="text-muted/40">—</span>}
      </td>
      <td className="px-3 py-2.5 text-center font-mono tabular-nums">
        {bronze || <span className="text-muted/40">—</span>}
      </td>
    </>
  );
}

function PodiumTableHeader() {
  return (
    <tr className="border-b border-border text-xs text-muted">
      <th className="px-3 py-2.5 text-left font-medium w-8 uppercase tracking-wide">
        #
      </th>
      <th className="px-3 py-2.5 text-left font-medium uppercase tracking-wide">
        Имя
      </th>
      <th className="px-3 py-2.5 text-center font-medium w-12 text-base" title="1-е место">
        🥇
      </th>
      <th className="px-3 py-2.5 text-center font-medium w-12 text-base" title="2-е место">
        🥈
      </th>
      <th className="px-3 py-2.5 text-center font-medium w-12 text-base" title="3-е место">
        🥉
      </th>
    </tr>
  );
}

function TeamPodiumTable({ rows }: { rows: OchpTeamPodiumRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">Нет данных о призовых местах.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="min-w-full text-sm">
        <thead>
          <PodiumTableHeader />
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row, i) => (
            <tr key={row.teamId} className="hover:bg-surface/50">
              <td className="px-3 py-2.5 text-muted font-mono tabular-nums w-8">
                {i + 1}
              </td>
              <td className="px-3 py-2.5">
                <a
                  href={`https://rating.chgk.info/teams/${row.teamId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-accent hover:underline"
                >
                  {row.name}
                </a>
                <span className="text-xs text-muted"> · {row.city}</span>
              </td>
              <MedalCells gold={row.gold} silver={row.silver} bronze={row.bronze} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerPodiumTable({ rows }: { rows: OchpPlayerPodiumRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">Нет данных о призовых местах.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="min-w-full text-sm">
        <thead>
          <PodiumTableHeader />
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row, i) => (
            <tr key={row.playerId} className="hover:bg-surface/50">
              <td className="px-3 py-2.5 text-muted font-mono tabular-nums w-8">
                {i + 1}
              </td>
              <td className="px-3 py-2.5">
                <a
                  href={`https://rating.chgk.info/players/${row.playerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-accent hover:underline"
                >
                  {row.name}
                </a>
              </td>
              <MedalCells gold={row.gold} silver={row.silver} bronze={row.bronze} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function OchpStatsTable() {
  const { seasons: rows, teamPodium, playerPodium } =
    await fetchOchpStatsPageData();

  return (
    <div className="space-y-10">
      <section className="space-y-4">
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
                <th className="px-3 py-2.5 text-center font-medium w-14">
                  Ком.
                </th>
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
                    {!row.held ? "не проводился" : (row.dateLabel ?? "—")}
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
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold">Призёры по командам</h2>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Число призовых мест (1–3) в польском зачёте ЧГК по итогам всех
            сезонов ОЧП. При ничьей на пьедестале обе команды получают одно и
            то же место.
          </p>
        </div>
        <TeamPodiumTable rows={teamPodium} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold">Призёры по игрокам</h2>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Суммарные призовые места игроков, входивших в состав команд
            пьедестала польского зачёта.
          </p>
        </div>
        <PlayerPodiumTable rows={playerPodium} />
      </section>
    </div>
  );
}
