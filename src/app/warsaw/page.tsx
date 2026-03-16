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

type Tab = "chgk" | "ksi" | "isi";

interface IsiRatingRow {
  pos: string;
  name: string;
  total: number;
  tours: (number | null)[];
  trend?: string;
}

interface IsiPocRow {
  pos: number;
  name: string;
  poc: number;
  sos: number;
  w: number;
  d: number;
  l: number;
  g: number;
}

interface IsiBout {
  tourName: string;
  boutIdx: number;
  scoreA: number;
  scoreB: number;
}

interface IsiCrossCell {
  winsA: number;
  winsB: number;
  draws: number;
  total: number;
  bouts: IsiBout[];
}

interface IsiData {
  rating: IsiRatingRow[];
  poc: IsiPocRow[];
  crossPlayers: string[];
  crossTable: Record<string, IsiCrossCell>;
}

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
  const [isiData, setIsiData] = useState<IsiData | null>(null);
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
        if (data.isi) setIsiData(data.isi);
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
        if (data.isi) setIsiData(data.isi);
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
        <TabButton active={tab === "ksi"} onClick={() => setTab("ksi")}>КСИ</TabButton>
        <TabButton active={tab === "isi"} onClick={() => setTab("isi")}>ИСИ</TabButton>
      </div>

      {tab === "chgk" ? (
        <ChgkTab leagueA={leagueA} leagueB={leagueB} tours={tours} matchDetails={matchDetails} leagueAOrder={leagueAOrder} leagueBOrder={leagueBOrder} />
      ) : tab === "ksi" ? (
        <KsiTab groupA={ksiA} groupB={ksiB} />
      ) : (
        <IsiTab data={isiData} />
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
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (
        tableRef.current && !tableRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
      ) setPopup(null);
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
    setPopup({
      row, col,
      x: rect.left + rect.width / 2,
      y: rect.top,
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
      <div className="overflow-x-auto rounded-xl border border-border bg-white" ref={tableRef}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-medium text-muted w-8">М</th>
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
      </div>

      {/* Popup — rendered as fixed overlay so it's never clipped */}
      {popup && homeResult && (
        <div className="fixed inset-0 z-[100]" onClick={() => setPopup(null)}>
          <div
            ref={popupRef}
            className="absolute w-80 rounded-xl border border-border bg-white shadow-xl"
            style={{
              left: Math.max(8, Math.min(popup.x - 160, window.innerWidth - 328)),
              top: Math.max(8, popup.y - 8),
              transform: "translateY(-100%)",
            }}
            onClick={(e) => e.stopPropagation()}
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
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── КСИ ───────────────────────── */

function KsiTab({ groupA, groupB }: { groupA: KsiTeam[]; groupB: KsiTeam[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">КСИ</h2>
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
  const [popup, setPopup] = useState<{
    teamIdx: number;
    tourIdx: number;
    x: number;
    y: number;
  } | null>(null);

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

  function handleCellClick(e: React.MouseEvent, teamIdx: number, tourIdx: number) {
    const team = teams[teamIdx];
    if (!team.themes?.[tourIdx]) return;
    const hasData = team.themes[tourIdx].some((v) => v !== null);
    if (!hasData) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top;

    if (x + 120 > window.innerWidth) x = window.innerWidth - 130;
    if (x < 120) x = 130;
    if (y < 200) y = rect.bottom;

    setPopup({ teamIdx, tourIdx, x, y });
  }

  const popupTeam = popup ? teams[popup.teamIdx] : null;
  const popupThemes = popup && popupTeam?.themes?.[popup.tourIdx];

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left font-medium w-14">М</th>
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
              const playedTours = team.tours.filter((t) => t !== null).length;
              const dropped = playedTours >= 2 && team.tours[minIdx] !== undefined;
              return (
                <tr key={i} className="hover:bg-surface/50">
                  <td className="px-3 py-2.5 font-bold text-muted whitespace-nowrap">{team.pos}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{team.name}</td>
                  {team.tours.map((v, ti) => {
                    const hasThemes = team.themes?.[ti]?.some((t) => t !== null);
                    return (
                      <td
                        key={ti}
                        className={`px-3 py-2.5 text-right font-mono ${
                          dropped && ti === minIdx
                            ? "text-red-400 line-through"
                            : v === null
                              ? "text-muted"
                              : "text-foreground"
                        } ${hasThemes ? "cursor-pointer hover:bg-accent/10 rounded" : ""}`}
                        onClick={hasThemes ? (e) => handleCellClick(e, i, ti) : undefined}
                      >
                        {v ?? "—"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-mono text-muted">{team.sum}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold">{team.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {popup && popupTeam && popupThemes && (
        <div className="fixed inset-0 z-50" onClick={() => setPopup(null)}>
          <div
            className="absolute bg-white rounded-xl shadow-2xl border border-border p-4 min-w-[220px]"
            style={{
              left: popup.x,
              top: popup.y,
              transform: "translate(-50%, -100%)",
              marginTop: "-8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm">{popupTeam.name}</span>
              <button onClick={() => setPopup(null)} className="text-muted hover:text-foreground ml-3">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-muted mb-2">Тур {popup.tourIdx + 1}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="py-1 text-left font-medium">Тема</th>
                  <th className="py-1 text-right font-medium">Очки</th>
                </tr>
              </thead>
              <tbody>
                {popupThemes.map((score, idx) => (
                  <tr key={idx} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-muted">Тема {idx + 1}</td>
                    <td className={`py-1.5 text-right font-mono font-medium ${
                      score !== null && score < 0 ? "text-red-500" : "text-foreground"
                    }`}>
                      {score ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="py-1.5 font-bold">Итого</td>
                  <td className="py-1.5 text-right font-mono font-bold">
                    {popupTeam.tours[popup.tourIdx] ?? "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── ИСИ ───────────────────────── */

function IsiTab({ data }: { data: IsiData | null }) {
  if (!data) {
    return (
      <div className="py-12 text-center text-muted">
        <p className="text-sm">Данные ИСИ ещё не загружены.</p>
        <p className="text-xs mt-1">Нажмите «Обновить результаты» для загрузки.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">ИСИ</h2>
        <a
          href="https://docs.google.com/spreadsheets/d/1QVmAvn4CywgLAghbcJWKWJT9jjZteZJZ4c_T--9ltF8"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Google Sheets <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {data.rating.length > 0 && <IsiRatingTable rows={data.rating} />}
      {data.poc.length > 0 && <IsiPocSection rows={data.poc} />}
      {data.crossPlayers.length > 0 && (
        <IsiCrossTableSection players={data.crossPlayers} crossTable={data.crossTable} />
      )}
    </div>
  );
}

function IsiRatingTable({ rows }: { rows: IsiRatingRow[] }) {
  const maxTours = Math.max(...rows.map((r) => r.tours.length), 0);

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold">Рейтинг</h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left font-medium w-12">М</th>
              <th className="px-3 py-2.5 text-left font-medium min-w-[160px]">Игрок</th>
              <th className="px-3 py-2.5 text-right font-medium w-20">Сумма</th>
              {Array.from({ length: maxTours }, (_, i) => (
                <th key={i} className="px-3 py-2.5 text-right font-medium w-16">Тур {i + 1}</th>
              ))}
              <th className="px-3 py-2.5 text-center font-medium w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-surface/50">
                <td className="px-3 py-2.5 font-bold text-muted">{row.pos}</td>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.name}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold">{row.total.toFixed(3)}</td>
                {row.tours.map((v, ti) => (
                  <td key={ti} className={`px-3 py-2.5 text-right font-mono ${v === null ? "text-muted" : "text-foreground"}`}>
                    {v ?? "—"}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center text-xs">
                  {row.trend === "up" ? <span className="text-green-600">▲</span> : row.trend === "down" ? <span className="text-red-500">▼</span> : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IsiPocSection({ rows }: { rows: IsiPocRow[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">Рейтинг POC</h3>
      <details className="mb-4 rounded-xl border border-border bg-surface/50 p-4 text-sm text-muted">
        <summary className="cursor-pointer font-semibold text-foreground">Как работает POC?</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p><strong>POC (Power-Ordered Classification)</strong> — итеративная система ранжирования, которая оценивает каждого игрока на основе <em>качества</em> его результатов, а не только количества побед.</p>
          <p>В отличие от ELO, которая обрабатывает игры последовательно и зависит от порядка, POC рассматривает <strong>все данные одновременно</strong> и пересчитывает рейтинги до сходимости (20 итераций).</p>
          <p><strong>За каждую игру игрок получает «кредит»:</strong></p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>Победа:</strong> кредит = сила_соперника × (1 + бонус_за_разгром). marginFactor = min(|разница| / 150, 1)</li>
            <li><strong>Ничья:</strong> кредит = сила_соперника × 0.4</li>
            <li><strong>Поражение:</strong> кредит = сила_соперника × 0.1 × (1 − marginFactor). Разгромное поражение = 0.</li>
          </ul>
          <p><strong>Рейтинг POC</strong> = средний кредит по всем играм, нормализованный к шкале 0–1000.</p>
          <p><strong>SOS</strong> (Strength of Schedule) — средняя сила соперников по той же шкале.</p>
          <div className="mt-3 rounded-lg bg-white p-3 font-mono text-xs leading-relaxed border border-border">
            <p>margin = |score_A − score_B|</p>
            <p>marginFactor = min(margin / 150, 1.0)</p>
            <p className="mt-1">Победа: credit = str(opp) × (1 + marginFactor)</p>
            <p>Ничья:&nbsp;&nbsp; credit = str(opp) × 0.4</p>
            <p>Пораж.:&nbsp; credit = str(opp) × 0.1 × (1 − marginFactor)</p>
            <p className="mt-1">POC(player) = avg(credits) / max(all_avg_credits) × 1000</p>
          </div>
        </div>
      </details>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left font-medium w-10">№</th>
              <th className="px-3 py-2.5 text-left font-medium min-w-[160px]">Игрок</th>
              <th className="px-3 py-2.5 text-right font-medium w-16">POC</th>
              <th className="px-3 py-2.5 text-right font-medium w-14">SOS</th>
              <th className="px-3 py-2.5 text-right font-medium w-10">В</th>
              <th className="px-3 py-2.5 text-right font-medium w-10">Н</th>
              <th className="px-3 py-2.5 text-right font-medium w-10">П</th>
              <th className="px-3 py-2.5 text-right font-medium w-10">И</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.name} className="hover:bg-surface/50">
                <td className="px-3 py-2.5 font-bold text-muted">{row.pos}</td>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.name}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold">{row.poc}</td>
                <td className="px-3 py-2.5 text-right font-mono text-muted text-xs">{row.sos}</td>
                <td className="px-3 py-2.5 text-right font-mono text-green-600">{row.w}</td>
                <td className="px-3 py-2.5 text-right font-mono text-amber-600">{row.d}</td>
                <td className="px-3 py-2.5 text-right font-mono text-red-500">{row.l}</td>
                <td className="px-3 py-2.5 text-right font-mono text-muted">{row.g}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IsiCrossTableSection({
  players,
  crossTable,
}: {
  players: string[];
  crossTable: Record<string, IsiCrossCell>;
}) {
  const [popup, setPopup] = useState<{
    pA: string;
    pB: string;
    cell: IsiCrossCell;
    x: number;
    y: number;
  } | null>(null);

  function getCell(pA: string, pB: string): IsiCrossCell | null {
    return crossTable[`${pA}|||${pB}`] || null;
  }

  function getCellReversed(pA: string, pB: string): { cell: IsiCrossCell; reversed: boolean } | null {
    const direct = crossTable[`${pA}|||${pB}`];
    if (direct) return { cell: direct, reversed: false };
    const rev = crossTable[`${pB}|||${pA}`];
    if (rev) return { cell: { ...rev, winsA: rev.winsB, winsB: rev.winsA, bouts: rev.bouts.map((b) => ({ ...b, scoreA: b.scoreB, scoreB: b.scoreA })) }, reversed: true };
    return null;
  }

  function handleCellClick(e: React.MouseEvent, pA: string, pB: string) {
    const result = getCellReversed(pA, pB);
    if (!result || !result.cell.total) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    if (x + 150 > window.innerWidth) x = window.innerWidth - 160;
    if (x < 150) x = 160;
    if (y < 250) y = rect.bottom + 8;

    setPopup({ pA, pB, cell: result.cell, x, y });
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold">Кросс-таблица личных встреч</h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="text-xs whitespace-nowrap border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-1.5 py-2 text-left font-medium text-muted sticky left-0 bg-white z-10 min-w-[28px]">№</th>
              <th className="px-2 py-2 text-left font-medium text-muted sticky left-7 bg-white z-10 min-w-[120px]">Игрок</th>
              {players.map((_, i) => (
                <th key={i} className="px-1 py-2 text-center font-medium text-muted w-10" title={players[i]}>
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((pA, i) => (
              <tr key={pA} className="border-b border-border/50 hover:bg-surface/30">
                <td className="px-1.5 py-1.5 font-bold text-muted sticky left-0 bg-white z-[5]">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium sticky left-7 bg-white z-[5]" title={pA}>
                  {pA}
                </td>
                {players.map((pB, j) => {
                  if (i === j) return <td key={j} className="bg-gray-200"></td>;
                  const result = getCellReversed(pA, pB);
                  if (!result || !result.cell.total) return <td key={j} className="px-1 py-1.5 text-center text-gray-300">—</td>;
                  const { cell } = result;
                  const cls =
                    cell.winsA > cell.winsB ? "text-green-600" :
                    cell.winsA < cell.winsB ? "text-red-500" :
                    "text-amber-600";
                  return (
                    <td
                      key={j}
                      className={`px-1 py-1.5 text-center font-semibold cursor-pointer hover:bg-accent/10 ${cls}`}
                      onClick={(e) => handleCellClick(e, pA, pB)}
                    >
                      {cell.winsA}:{cell.winsB}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popup && (
        <div className="fixed inset-0 z-50" onClick={() => setPopup(null)}>
          <div
            className="absolute bg-white rounded-xl shadow-2xl border border-border p-4 min-w-[280px] max-h-[70vh] overflow-y-auto"
            style={{
              left: popup.x,
              top: popup.y,
              transform: "translate(-50%, -100%)",
              marginTop: "-8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{popup.pA} — {popup.pB}</span>
              <button onClick={() => setPopup(null)} className="text-muted hover:text-foreground ml-3">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center text-xl font-bold text-foreground mb-3">
              {popup.cell.winsA} : {popup.cell.winsB}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="py-1 text-left font-medium">Тур</th>
                  <th className="py-1 text-center font-medium">Результат</th>
                  <th className="py-1 text-right font-medium">Счёт</th>
                </tr>
              </thead>
              <tbody>
                {popup.cell.bouts.map((bout, idx) => {
                  const isWin = bout.scoreA > bout.scoreB;
                  const isLoss = bout.scoreA < bout.scoreB;
                  return (
                    <tr key={idx} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 text-muted text-xs">{bout.tourName}, бой {bout.boutIdx}</td>
                      <td className={`py-1.5 text-center font-medium ${isWin ? "text-green-600" : isLoss ? "text-red-500" : "text-amber-600"}`}>
                        {isWin ? "победа" : isLoss ? "поражение" : "ничья"}
                      </td>
                      <td className="py-1.5 text-right font-mono">{bout.scoreA} : {bout.scoreB}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
