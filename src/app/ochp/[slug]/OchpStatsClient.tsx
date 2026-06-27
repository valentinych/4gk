"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { ochpRatingPublicUrl } from "@/lib/ochp-seasons";
import {
  OCHP_STATS_PAGE_SIZE,
  type OchpPlayerPodiumRow,
  type OchpSeasonStatRow,
  type OchpStatsPaginatedResponse,
  type OchpStatsTableId,
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
      <th className="px-3 py-2.5 text-left font-medium uppercase tracking-wide">
        Имя
      </th>
      <th
        className="px-3 py-2.5 text-center font-medium w-12 text-base"
        title="1-е место"
      >
        🥇
      </th>
      <th
        className="px-3 py-2.5 text-center font-medium w-12 text-base"
        title="2-е место"
      >
        🥈
      </th>
      <th
        className="px-3 py-2.5 text-center font-medium w-12 text-base"
        title="3-е место"
      >
        🥉
      </th>
    </tr>
  );
}

function TablePagination({
  page,
  totalPages,
  total,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3">
      <p className="text-xs text-muted">
        {total} {total === 1 ? "строка" : total < 5 ? "строки" : "строк"}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface/80 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Назад
        </button>
        <span className="min-w-[4.5rem] text-center text-xs font-mono tabular-nums text-muted">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface/80 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Следующая страница"
        >
          Вперёд
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function TableShell({
  loading,
  error,
  empty,
  children,
  pagination,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: React.ReactNode;
  pagination: React.ReactNode;
}) {
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-surface/70 backdrop-blur-[1px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      )}
      {empty && !loading ? (
        <p className="text-sm text-muted">Нет данных.</p>
      ) : (
        children
      )}
      {pagination}
    </div>
  );
}

function usePaginatedOchpTable<T>(table: OchpStatsTableId) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OchpStatsPaginatedResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        table,
        page: String(nextPage),
        pageSize: String(OCHP_STATS_PAGE_SIZE),
      });
      const res = await fetch(`/api/ochp/stats?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as OchpStatsPaginatedResponse<T>;
      setData(payload);
      setPage(payload.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const goToPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1) return;
      if (data && nextPage > data.totalPages) return;
      setPage(nextPage);
    },
    [data],
  );

  return { data, loading, error, page, goToPage };
}

function SeasonsTableSection() {
  const { data, loading, error, goToPage } =
    usePaginatedOchpTable<OchpSeasonStatRow>("seasons");
  const rows = data?.rows ?? [];

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        Сводка по сезонам Открытого чемпионата Польши: победители общего и
        польского зачётов ЧГК, число команд и ссылки на результаты.
      </p>

      <TableShell
        loading={loading}
        error={error}
        empty={rows.length === 0}
        pagination={
          data ? (
            <TablePagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              loading={loading}
              onPageChange={goToPage}
            />
          ) : null
        }
      >
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
                          · {row.overallWinner.city} ·{" "}
                          {row.overallWinner.score}
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
                            href={ochpRatingPublicUrl(row.tournamentId)}
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
      </TableShell>
    </section>
  );
}

function TeamPodiumSection() {
  const { data, loading, error, goToPage } =
    usePaginatedOchpTable<OchpTeamPodiumRow>("teams");
  const rows = data?.rows ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Призёры по командам</h2>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          Число призовых мест (1–3) в польском зачёте ЧГК по итогам всех
          сезонов ОЧП. При ничьей на пьедестале обе команды получают одно и
          то же место.
        </p>
      </div>

      <TableShell
        loading={loading}
        error={error}
        empty={rows.length === 0}
        pagination={
          data ? (
            <TablePagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              loading={loading}
              onPageChange={goToPage}
            />
          ) : null
        }
      >
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead>
              <PodiumTableHeader />
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => (
                <tr key={row.teamId} className="hover:bg-surface/50">
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
                  <MedalCells
                    gold={row.gold}
                    silver={row.silver}
                    bronze={row.bronze}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableShell>
    </section>
  );
}

function PlayerPodiumSection() {
  const { data, loading, error, goToPage } =
    usePaginatedOchpTable<OchpPlayerPodiumRow>("players");
  const rows = data?.rows ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Призёры по игрокам</h2>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          Суммарные призовые места игроков, входивших в состав команд
          пьедестала польского зачёта.
        </p>
      </div>

      <TableShell
        loading={loading}
        error={error}
        empty={rows.length === 0}
        pagination={
          data ? (
            <TablePagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              loading={loading}
              onPageChange={goToPage}
            />
          ) : null
        }
      >
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead>
              <PodiumTableHeader />
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => (
                <tr key={row.playerId} className="hover:bg-surface/50">
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
                  <MedalCells
                    gold={row.gold}
                    silver={row.silver}
                    bronze={row.bronze}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableShell>
    </section>
  );
}

export default function OchpStatsClient() {
  return (
    <div className="space-y-10">
      <SeasonsTableSection />
      <TeamPodiumSection />
      <PlayerPodiumSection />
    </div>
  );
}
