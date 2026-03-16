"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Calendar, MapPin, Users, Trophy, ExternalLink, RefreshCw, Loader2, Check, X as XIcon } from "lucide-react";
import {
  chgkLeagueA as fallbackA,
  chgkLeagueB as fallbackB,
  chgkTours as fallbackTours,
  ksiGroupA as fallbackKsiA,
  ksiGroupB as fallbackKsiB,
  type CrossTableTeam,
  type KsiTeam,
} from "@/data/warsaw";

type Tab = "chgk" | "ksi";

interface MatchStage {
  name: string;
  team1Score: number;
  team2Score: number;
  winner: "team1" | "team2" | "draw";
}

interface MatchDetail {
  team1Name: string;
  team2Name: string;
  stages: MatchStage[];
}

interface ParsedLeague {
  name: string;
  teams: { id: number; name: string; pts: number; w: number; d: number; l: number; results: (string | null)[] }[];
  teamOrder: number[];
}

interface Tour {
  name: string;
  winners: string;
  score: number;
}

export default function WarsawPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [tab, setTab] = useState<Tab>("chgk");

  const [leagueA, setLeagueA] = useState<CrossTableTeam[]>(fallbackA);
  const [leagueB, setLeagueB] = useState<CrossTableTeam[]>(fallbackB);
  const [tours, setTours] = useState<Tour[]>(fallbackTours);
  const [matchDetails, setMatchDetails] = useState<Record<string, MatchDetail>>({});
  const [leagueAOrder, setLeagueAOrder] = useState<number[]>([]);
  const [leagueBOrder, setLeagueBOrder] = useState<number[]>([]);
  const [ksiA, setKsiA] = useState<KsiTeam[]>(fallbackKsiA);
  const [ksiB, setKsiB] = useState<KsiTeam[]>(fallbackKsiB);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"ok" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/warsaw/data")
      .then((r) => r.json())
      .then((data) => {
        if (data.chgk) {
          const chgk = data.chgk;
          if (chgk.leagues?.[0]) {
            setLeagueA(chgk.leagues[0].teams);
            setLeagueAOrder(chgk.leagues[0].teamOrder);
          }
          if (chgk.leagues?.[1]) {
            setLeagueB(chgk.leagues[1].teams);
            setLeagueBOrder(chgk.leagues[1].teamOrder);
          }
          if (chgk.tours?.length) setTours(chgk.tours);
          if (chgk.matchDetails) setMatchDetails(chgk.matchDetails);
        }
        if (data.ksi) {
          if (data.ksi.groupA?.length) setKsiA(data.ksi.groupA);
          if (data.ksi.groupB?.length) setKsiB(data.ksi.groupB);
        }
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      })
      .catch(() => {});
  }, []);

  async function handleUpdate() {
    setUpdating(true);
    setUpdateStatus(null);
    try {
      const res = await fetch("/api/admin/warsaw/update", { method: "POST" });
      if (res.ok || res.status === 207) {
        setUpdateStatus("ok");
        const dataRes = await fetch("/api/warsaw/data");
        const data = await dataRes.json();
        if (data.chgk?.leagues?.[0]) {
          setLeagueA(data.chgk.leagues[0].teams);
          setLeagueAOrder(data.chgk.leagues[0].teamOrder);
        }
        if (data.chgk?.leagues?.[1]) {
          setLeagueB(data.chgk.leagues[1].teams);
          setLeagueBOrder(data.chgk.leagues[1].teamOrder);
        }
        if (data.chgk?.tours?.length) setTours(data.chgk.tours);
        if (data.chgk?.matchDetails) setMatchDetails(data.chgk.matchDetails);
        if (data.ksi?.groupA?.length) setKsiA(data.ksi.groupA);
        if (data.ksi?.groupB?.length) setKsiB(data.ksi.groupB);
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      } else {
        setUpdateStatus("error");
      }
    } catch {
      setUpdateStatus("error");
    } finally {
      setUpdating(false);
      setTimeout(() => setUpdateStatus(null), 3000);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Trophy className="h-3.5 w-3.5" />
          Сезон 2025/2026
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Чемпионат Варшавы</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Регулярный чемпионат по интеллектуальным играм среди команд Варшавы.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : updateStatus === "ok" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : updateStatus === "error" ? (
                <XIcon className="h-4 w-4 text-red-600" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Обновить результаты
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <InfoCard icon={<MapPin className="h-4 w-4 text-muted" />} label="Город" value="Варшава" />
        <InfoCard icon={<Calendar className="h-4 w-4 text-muted" />} label="Сезон" value="2025/2026" />
        <InfoCard
          icon={<Users className="h-4 w-4 text-muted" />}
          label="Обновлено"
          value={updatedAt ? new Date(updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
        />
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-surface p-1">
        <TabButton active={tab === "chgk"} onClick={() => setTab("chgk")}>ЧГК</TabButton>
        <TabButton active={tab === "ksi"} onClick={() => setTab("ksi")}>КСИ (Своя игра)</TabButton>
      </div>

      {tab === "chgk" ? (
        <ChgkTab leagueA={leagueA} leagueB={leagueB} tours={tours} matchDetails={matchDetails} leagueAOrder={leagueAOrder} leagueBOrder={leagueBOrder} />
      ) : (
        <KsiTab groupA={ksiA} groupB={ksiB} />
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">{icon}</div>
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── ЧГК ───────────────────────── */

interface ChgkTabProps {
  leagueA: CrossTableTeam[];
  leagueB: CrossTableTeam[];
  tours: Tour[];
  matchDetails: Record<string, MatchDetail>;
  leagueAOrder: number[];
  leagueBOrder: number[];
}

function ChgkTab({ leagueA, leagueB, tours, matchDetails, leagueAOrder, leagueBOrder }: ChgkTabProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Микроматчи ЧГК</h2>
        <a href="https://micromatches.com/waw-26" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
          micromatches.com <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <CrossTableSection title="Лига А" teams={leagueA} matchDetails={matchDetails} teamOrder={leagueAOrder} />
      <CrossTableSection title="Лига Б" teams={leagueB} matchDetails={matchDetails} teamOrder={leagueBOrder} />

      {tours.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold">Туры</h3>
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wider">
                  <th className="px-4 py-2.5 font-medium">Тур</th>
                  <th className="px-4 py-2.5 font-medium">Победитель</th>
                  <th className="px-4 py-2.5 font-medium text-right">Очки</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tours.map((t, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="px-4 py-2.5">{t.name}</td>
                    <td className="px-4 py-2.5 font-medium">{t.winners}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{t.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface CrossTableProps {
  title: string;
  teams: CrossTableTeam[];
  matchDetails: Record<string, MatchDetail>;
  teamOrder: number[];
}

function CrossTableSection({ title, teams, matchDetails, teamOrder }: CrossTableProps) {
  const [popup, setPopup] = useState<{ row: number; col: number; x: number; y: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) setPopup(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function getResultColor(result: string | null): string {
    if (!result) return "";
    const [a, b] = result.split(":").map(Number);
    if (a > b) return "bg-green-50 text-green-800 hover:bg-green-100";
    if (a < b) return "bg-red-50 text-red-800 hover:bg-red-100";
    return "bg-yellow-50 text-yellow-800 hover:bg-yellow-100";
  }

  function handleCellClick(row: number, col: number, e: React.MouseEvent) {
    if (row === col || !teams[row].results[col]) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = tableRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setPopup({
      row, col,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
    });
  }

  const getDetailKey = useCallback((row: number, col: number): string | null => {
    if (teamOrder.length > 0) return `${teamOrder[row]}-${teamOrder[col]}`;
    return null;
  }, [teamOrder]);

  const detail = popup ? (getDetailKey(popup.row, popup.col) ? matchDetails[getDetailKey(popup.row, popup.col)!] : null) : null;
  const homeResult = popup ? teams[popup.row].results[popup.col] : null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="relative overflow-x-auto rounded-xl border border-border bg-white" ref={tableRef}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-medium text-muted w-8">#</th>
              <th className="sticky left-8 z-10 bg-white px-2 py-2 text-left font-medium text-muted min-w-[140px]">Команда</th>
              <th className="px-1.5 py-2 text-center font-medium text-muted w-8">О</th>
              <th className="px-1.5 py-2 text-center font-medium text-muted w-7">В</th>
              <th className="px-1.5 py-2 text-center font-medium text-muted w-7">Н</th>
              <th className="px-1.5 py-2 text-center font-medium text-muted w-7">П</th>
              {teams.map((_, i) => (
                <th key={i} className="px-1 py-2 text-center font-medium text-muted w-10">{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teams.map((team, row) => (
              <tr key={row} className="hover:bg-surface/30">
                <td className="sticky left-0 z-10 bg-white px-2 py-1.5 font-bold text-muted">{row + 1}</td>
                <td className="sticky left-8 z-10 bg-white px-2 py-1.5 font-medium whitespace-nowrap max-w-[180px] truncate" title={team.name}>{team.name}</td>
                <td className="px-1.5 py-1.5 text-center font-bold">{team.pts}</td>
                <td className="px-1.5 py-1.5 text-center text-muted">{team.w}</td>
                <td className="px-1.5 py-1.5 text-center text-muted">{team.d}</td>
                <td className="px-1.5 py-1.5 text-center text-muted">{team.l}</td>
                {team.results.map((result, col) => (
                  <td key={col} className="px-0.5 py-0.5 text-center">
                    {row === col ? (
                      <span className="inline-block w-full rounded bg-gray-100 px-1 py-1 text-gray-400">—</span>
                    ) : result ? (
                      <button
                        onClick={(e) => handleCellClick(row, col, e)}
                        className={`inline-block w-full rounded px-1 py-1 font-mono text-[11px] font-semibold cursor-pointer transition-colors ${getResultColor(result)}`}
                      >
                        {result}
                      </button>
                    ) : (
                      <span className="inline-block w-full rounded bg-surface px-1 py-1 text-muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Popup */}
        {popup && homeResult && (
          <div
            className="absolute z-50 w-80 rounded-xl border border-border bg-white shadow-xl"
            style={{ left: Math.max(8, Math.min(popup.x - 160, (tableRef.current?.scrollWidth ?? 320) - 328)), top: popup.y - 8, transform: "translateY(-100%)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Микроматч</span>
              <button onClick={() => setPopup(null)} className="rounded p-0.5 text-muted hover:text-foreground"><XIcon className="h-3.5 w-3.5" /></button>
            </div>

            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex-1 text-xs font-bold text-right leading-tight">{teams[popup.row].name}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-2xl font-bold">{homeResult.split(":")[0]}</span>
                  <span className="text-lg text-muted">:</span>
                  <span className="text-2xl font-bold">{homeResult.split(":")[1]}</span>
                </div>
                <p className="flex-1 text-xs font-bold leading-tight">{teams[popup.col].name}</p>
              </div>
            </div>

            {detail && detail.stages.length > 0 && (
              <div className="border-t border-border divide-y divide-border">
                {detail.stages.map((stage, i) => (
                  <div key={i} className="flex items-center px-4 py-2 text-xs">
                    <div className="flex items-center gap-1.5 w-16 justify-end">
                      {stage.winner === "team1" ? (
                        <span className="text-green-600 font-bold">&#10003;</span>
                      ) : (
                        <span className="text-red-500 font-bold">&#10007;</span>
                      )}
                      <span className="font-mono font-semibold">{stage.team1Score}</span>
                    </div>
                    <div className="flex-1 text-center px-2">
                      <span className="font-medium text-muted">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 w-16">
                      <span className="font-mono font-semibold">{stage.team2Score}</span>
                      {stage.winner === "team2" ? (
                        <span className="text-green-600 font-bold">&#10003;</span>
                      ) : (
                        <span className="text-red-500 font-bold">&#10007;</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!detail && (
              <div className="border-t border-border px-4 py-3">
                <p className="text-center text-xs text-muted">Обратный: {teams[popup.col].results[popup.row] ?? "—"}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── КСИ ───────────────────────── */

function KsiTab({ groupA, groupB }: { groupA: KsiTeam[]; groupB: KsiTeam[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">КСИ (Своя игра)</h2>
        <a href="https://docs.google.com/spreadsheets/d/1qFeswBW7vho7U8h9GvGGe8ZAXIqN4Tn0oZHeH5vzo4A" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
          Google Sheets <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <KsiTable title="Лига А" teams={groupA} />
      <KsiTable title="Лига Б" teams={groupB} />
    </div>
  );
}

function KsiTable({ title, teams }: { title: string; teams: KsiTeam[] }) {
  function getMinTourIdx(tours: (number | null)[]): number {
    let minIdx = 0;
    let minVal = Infinity;
    tours.forEach((v, i) => {
      if (v !== null && v < minVal) {
        minVal = v;
        minIdx = i;
      }
    });
    return minIdx;
  }

  const maxTours = Math.max(...teams.map((t) => t.tours.length), 0);

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left font-medium w-10">М</th>
              <th className="px-3 py-2.5 text-left font-medium min-w-[180px]">Команда</th>
              {Array.from({ length: maxTours }, (_, i) => (
                <th key={i} className="px-3 py-2.5 text-right font-medium w-16">Тур {i + 1}</th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium w-16">Сумма</th>
              <th className="px-3 py-2.5 text-right font-medium w-20">Итог</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teams.map((team, i) => {
              const minIdx = getMinTourIdx(team.tours);
              const dropped = team.sum !== team.total;
              return (
                <tr key={i} className="hover:bg-surface/50">
                  <td className="px-3 py-2.5 font-bold text-muted">{team.pos}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{team.name}</td>
                  {team.tours.map((v, ti) => (
                    <td
                      key={ti}
                      className={`px-3 py-2.5 text-right font-mono ${
                        dropped && ti === minIdx
                          ? "text-red-400 line-through"
                          : v === null
                            ? "text-muted"
                            : "text-foreground"
                      }`}
                    >
                      {v ?? "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-mono text-muted">{team.sum}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold">{team.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
