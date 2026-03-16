"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, MapPin, Users, Trophy, ExternalLink } from "lucide-react";
import {
  chgkLeagueA,
  chgkLeagueB,
  chgkTours,
  ksiGroupA,
  ksiGroupB,
  type CrossTableTeam,
  type KsiTeam,
} from "@/data/warsaw";

type Tab = "chgk" | "ksi";

export default function WarsawPage() {
  const [tab, setTab] = useState<Tab>("chgk");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Trophy className="h-3.5 w-3.5" />
          Сезон 2025/2026
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Чемпионат Варшавы</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Регулярный чемпионат по интеллектуальным играм среди команд Варшавы.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <InfoCard icon={<MapPin className="h-4 w-4 text-muted" />} label="Город" value="Варшава" />
        <InfoCard icon={<Calendar className="h-4 w-4 text-muted" />} label="Сезон" value="2025/2026" />
        <InfoCard icon={<Users className="h-4 w-4 text-muted" />} label="Команды" value="21" />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-surface p-1">
        <TabButton active={tab === "chgk"} onClick={() => setTab("chgk")}>
          ЧГК
        </TabButton>
        <TabButton active={tab === "ksi"} onClick={() => setTab("ksi")}>
          КСИ (Своя игра)
        </TabButton>
      </div>

      {tab === "chgk" ? <ChgkTab /> : <KsiTab />}
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

function ChgkTab() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Микроматчи ЧГК</h2>
        <a
          href="https://micromatches.com/waw-26"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          micromatches.com <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <CrossTableSection title="Лига А" teams={chgkLeagueA} />
      <CrossTableSection title="Лига Б" teams={chgkLeagueB} />

      {/* Tours */}
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
              {chgkTours.map((t, i) => (
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
    </div>
  );
}

function CrossTableSection({ title, teams }: { title: string; teams: CrossTableTeam[] }) {
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
      row,
      col,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
    });
  }

  const homeResult = popup ? teams[popup.row].results[popup.col] : null;
  const awayResult = popup ? teams[popup.col].results[popup.row] : null;

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
                <td className="sticky left-8 z-10 bg-white px-2 py-1.5 font-medium whitespace-nowrap max-w-[180px] truncate" title={team.name}>
                  {team.name}
                </td>
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
            className="absolute z-50 w-64 rounded-xl border border-border bg-white p-4 shadow-xl"
            style={{ left: Math.max(8, popup.x - 128), top: popup.y - 8, transform: "translateY(-100%)" }}
          >
            <div className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">Микроматч</div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-right">
                <p className="text-xs font-bold leading-tight">{teams[popup.row].name}</p>
              </div>
              <div className="flex items-center gap-2">
                <ScoreBadge score={homeResult.split(":")[0]} isWinner={Number(homeResult.split(":")[0]) > Number(homeResult.split(":")[1])} />
                <span className="text-xs text-muted font-bold">:</span>
                <ScoreBadge score={homeResult.split(":")[1]} isWinner={Number(homeResult.split(":")[1]) > Number(homeResult.split(":")[0])} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold leading-tight">{teams[popup.col].name}</p>
              </div>
            </div>
            {awayResult && (
              <div className="mt-2 text-center text-[10px] text-muted">
                Обратный: {awayResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ score, isWinner }: { score: string; isWinner: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
        isWinner ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
      }`}
    >
      {score}
    </span>
  );
}

/* ───────────────────────── КСИ ───────────────────────── */

function KsiTab() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">КСИ (Своя игра)</h2>
        <a
          href="https://docs.google.com/spreadsheets/d/1qFeswBW7vho7U8h9GvGGe8ZAXIqN4Tn0oZHeH5vzo4A"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Google Sheets <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <KsiTable title="Лига А" teams={ksiGroupA} />
      <KsiTable title="Лига Б" teams={ksiGroupB} />
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

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left font-medium w-10">М</th>
              <th className="px-3 py-2.5 text-left font-medium min-w-[180px]">Команда</th>
              {[1, 2, 3, 4, 5].map((t) => (
                <th key={t} className="px-3 py-2.5 text-right font-medium w-16">Тур {t}</th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium w-16">Сумма</th>
              <th className="px-3 py-2.5 text-right font-medium w-20">Итог</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teams.map((team, i) => {
              const minIdx = team.sum !== team.total ? getMinTourIdx(team.tours) : -1;
              return (
                <tr key={i} className="hover:bg-surface/50">
                  <td className="px-3 py-2.5 font-bold text-muted">{team.pos}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{team.name}</td>
                  {team.tours.map((v, ti) => (
                    <td
                      key={ti}
                      className={`px-3 py-2.5 text-right font-mono ${
                        ti === minIdx
                          ? "text-red-400 line-through"
                          : v !== null && v > 0
                            ? "text-foreground"
                            : v !== null && v < 0
                              ? "text-red-600"
                              : "text-muted"
                      }`}
                    >
                      {v ?? "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-mono text-muted">{team.sum}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold">
                    {team.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
