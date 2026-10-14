"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Calendar, ChevronDown, MapPin, Users, Trophy, ExternalLink, RefreshCw, Loader2, Check, X as XIcon } from "lucide-react";
import {
  chgkLeagueA as fallbackA,
  chgkLeagueB as fallbackB,
  chgkTours as fallbackTours,
  ksiGroupA as fallbackKsiA,
  ksiGroupB as fallbackKsiB,
  type CrossTableTeam,
  type KsiTeam,
} from "@/data/warsaw";
import {
  WARSAW_CHGK_2627_SLUG,
  WARSAW_CURRENT_SEASON_START,
  WARSAW_KSI_2627_SHEET_ID,
  WARSAW_SEASON_STARTS,
  formatWarsawSeason,
  isWarsawCurrentSeason,
  parseWarsawSeasonStart,
  warsawKsiSheetUrl,
  type WarsawSeasonStart,
} from "@/lib/warsaw-seasons";
import { IsiLiveResults } from "./IsiLiveResults";

type Tab = "chgk" | "ksi" | "isi";

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
  teams: { id: number; name: string; league?: string; pts: number; w: number; d: number; l: number; results: (string | null)[] }[];
  teamOrder: number[];
}

interface ChgkLeagueView {
  name: string;
  teams: CrossTableTeam[];
  teamOrder: number[];
}

interface OverallView {
  teams: CrossTableTeam[];
  teamOrder: number[];
  leagueNames: string[];
}

function emptyOverall(): OverallView {
  return { teams: [], teamOrder: [], leagueNames: [] };
}

/** Within-league scores only. Used when a payload has no `overall` (static fallback, old cache). */
function deriveOverall(leagues: ChgkLeagueView[]): OverallView {
  return {
    leagueNames: leagues.flatMap((league) => league.teams.map(() => league.name)),
    teamOrder: leagues.flatMap((league) => league.teams.map((_, index) => league.teamOrder[index] ?? -1)),
    teams: leagues.flatMap((league, leagueIndex) =>
      league.teams.map((team) => ({
        name: team.name,
        pts: team.pts,
        w: team.w,
        d: team.d,
        l: team.l,
        results: leagues.flatMap((other, otherIndex) =>
          other.teams.map((_, col) => (otherIndex === leagueIndex ? (team.results[col] ?? null) : null)),
        ),
      })),
    ),
  };
}

function fallbackLeagues(): ChgkLeagueView[] {
  return [
    { name: "Лига А", teams: fallbackA, teamOrder: [] },
    { name: "Лига Б", teams: fallbackB, teamOrder: [] },
  ];
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
  const [season, setSeason] = useState<WarsawSeasonStart>(WARSAW_CURRENT_SEASON_START);
  const currentSeason = isWarsawCurrentSeason(season);
  const seasonLabel = formatWarsawSeason(season);

  // Sync hash → tab and ?season= on back/forward
  useEffect(() => {
    function onHash() {
      const h = window.location.hash.replace("#", "") as Tab;
      if ((["chgk", "ksi", "isi"] as Tab[]).includes(h)) setTab(h);
    }
    function onPop() {
      setSeason(parseWarsawSeasonStart(new URLSearchParams(window.location.search).get("season")));
      onHash();
    }
    setSeason(parseWarsawSeasonStart(new URLSearchParams(window.location.search).get("season")));
    onHash();
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  function switchSeason(next: WarsawSeasonStart) {
    const url = new URL(window.location.href);
    if (next === WARSAW_CURRENT_SEASON_START) url.searchParams.delete("season");
    else url.searchParams.set("season", String(next));
    window.history.pushState({}, "", url);
    setSeason(next);
  }

  function switchTab(t: Tab) {
    window.location.hash = t;
    setTab(t);
  }

  const [leagues, setLeagues] = useState<ChgkLeagueView[]>([]);
  const [overall, setOverall] = useState<OverallView>(emptyOverall());
  const [tours, setTours] = useState<Tour[]>([]);
  const [matchDetails, setMatchDetails] = useState<Record<string, MatchDetail>>({});
  const [ksiA, setKsiA] = useState<KsiTeam[]>([]);
  const [ksiB, setKsiB] = useState<KsiTeam[]>([]);
  const [chgkNeedsPassword, setChgkNeedsPassword] = useState(false);
  const [isiData, setIsiData] = useState<IsiData | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"ok" | "error" | null>(null);

  const applyData = useCallback((data: {
    chgk?: {
      leagues?: ParsedLeague[];
      overall?: { teams?: ParsedLeague["teams"]; teamOrder?: number[] };
      tours?: Tour[];
      matchDetails?: Record<string, MatchDetail>;
    } | null;
    ksi?: { groupA?: KsiTeam[]; groupB?: KsiTeam[] } | null;
    isi?: IsiData | null;
    updatedAt?: string | null;
    chgkNeedsPassword?: boolean;
  }, forCurrent: boolean) => {
    if (data.chgk) {
      const chgk = data.chgk;
      const nextLeagues: ChgkLeagueView[] = (chgk.leagues ?? [])
        .filter((league) => league.teams?.length)
        .map((league) => ({
          name: league.name,
          teams: league.teams,
          teamOrder: league.teamOrder ?? [],
        }));
      if (nextLeagues.length || forCurrent) setLeagues(nextLeagues);

      const apiTeams = chgk.overall?.teams ?? [];
      const apiOrder = chgk.overall?.teamOrder ?? [];
      const apiOverallReady =
        apiTeams.length > 0 &&
        apiOrder.length === apiTeams.length &&
        apiTeams.every((team) => typeof team.league === "string" && team.results.length === apiTeams.length);
      if (apiOverallReady) {
        setOverall({
          teams: apiTeams,
          teamOrder: apiOrder,
          leagueNames: apiTeams.map((team) => team.league!),
        });
      } else if (nextLeagues.length) {
        setOverall(deriveOverall(nextLeagues));
      } else if (forCurrent) {
        setOverall(emptyOverall());
      }

      if (chgk.tours?.length) setTours(chgk.tours);
      else if (forCurrent) setTours([]);
      if (chgk.matchDetails) setMatchDetails(chgk.matchDetails);
      else if (forCurrent) setMatchDetails({});
    } else if (forCurrent) {
      setLeagues([]);
      setOverall(emptyOverall());
      setTours([]);
      setMatchDetails({});
    }
    if (data.ksi) {
      if (forCurrent) {
        setKsiA(data.ksi.groupA ?? []);
        setKsiB(data.ksi.groupB ?? []);
      } else {
        if (data.ksi.groupA?.length) setKsiA(data.ksi.groupA);
        if (data.ksi.groupB?.length) setKsiB(data.ksi.groupB);
      }
    } else if (forCurrent) {
      setKsiA([]);
      setKsiB([]);
    }
    if (data.isi) setIsiData(data.isi);
    if (data.updatedAt) setUpdatedAt(data.updatedAt);
    else if (forCurrent) setUpdatedAt(null);
    setChgkNeedsPassword(forCurrent && data.chgkNeedsPassword === true);
  }, []);

  const loadSeason = useCallback(async (start: WarsawSeasonStart, signal?: AbortSignal) => {
    const forCurrent = isWarsawCurrentSeason(start);
    if (!forCurrent) {
      const seeded = fallbackLeagues();
      setLeagues(seeded);
      setOverall(deriveOverall(seeded));
      setTours(fallbackTours);
      setKsiA(fallbackKsiA);
      setKsiB(fallbackKsiB);
      setChgkNeedsPassword(false);
    }
    const url = forCurrent ? "/api/warsaw/data?season=2026" : "/api/warsaw/data";
    const res = await fetch(url, { cache: "no-store", signal, credentials: "same-origin" });
    const data = await res.json();
    if (signal?.aborted) return;
    applyData(data, forCurrent);
  }, [applyData]);

  useEffect(() => {
    const ac = new AbortController();
    if (isWarsawCurrentSeason(season)) {
      setLeagues([]);
      setOverall(emptyOverall());
      setTours([]);
      setMatchDetails({});
      setKsiA([]);
      setKsiB([]);
      setChgkNeedsPassword(false);
      setUpdatedAt(null);
    }
    loadSeason(season, ac.signal).catch(() => {});
    return () => ac.abort();
  }, [season, loadSeason]);

  async function handleUpdate() {
    setUpdating(true);
    setUpdateStatus(null);
    try {
      const res = await fetch("/api/admin/warsaw/update", { method: "POST" });
      if (res.ok || res.status === 207) {
        setUpdateStatus("ok");
        await loadSeason(season);
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
    <div id="page-warsaw" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div id="page-warsaw-header" className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Trophy className="h-3.5 w-3.5" />
          Сезон {seasonLabel}
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
              className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50"
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

      <div id="page-warsaw-info-cards" className="mb-6 grid gap-4 sm:grid-cols-3">
        <InfoCard icon={<MapPin className="h-4 w-4 text-muted" />} label="Город" value="Варшава" />
        <SeasonCard season={season} onChange={switchSeason} />
        <InfoCard
          icon={<Users className="h-4 w-4 text-muted" />}
          label="Обновлено"
          value={
            updatedAt
              ? new Date(updatedAt).toLocaleString("ru-RU", { timeZone: "Europe/Warsaw", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
              : "—"
          }
        />
      </div>

      <div id="page-warsaw-tabs" className="mb-6 flex gap-1 rounded-xl border border-border bg-surface p-1">
        <TabButton active={tab === "chgk"} onClick={() => switchTab("chgk")}>ЧГК</TabButton>
        <TabButton active={tab === "ksi"} onClick={() => switchTab("ksi")}>КСИ</TabButton>
        <TabButton active={tab === "isi"} onClick={() => switchTab("isi")}>ИСИ</TabButton>
      </div>

      {tab === "chgk" ? (
        <ChgkTab
          leagues={leagues}
          overall={overall}
          tours={tours}
          matchDetails={matchDetails}
          sourceHref={currentSeason ? `https://micromatches.com/${WARSAW_CHGK_2627_SLUG}` : "https://micromatches.com/waw-26"}
          needsPassword={currentSeason && chgkNeedsPassword}
          onUnlocked={() => {
            loadSeason(season).catch(() => {});
          }}
        />
      ) : tab === "ksi" ? (
        <KsiTab
          groupA={ksiA}
          groupB={ksiB}
          sheetHref={
            currentSeason
              ? warsawKsiSheetUrl(WARSAW_KSI_2627_SHEET_ID)
              : "https://docs.google.com/spreadsheets/d/1qFeswBW7vho7U8h9GvGGe8ZAXIqN4Tn0oZHeH5vzo4A"
          }
        />
      ) : currentSeason ? (
        <IsiLiveResults />
      ) : (
        <IsiTab data={isiData} />
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
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

function SeasonCard({
  season,
  onChange,
}: {
  season: WarsawSeasonStart;
  onChange: (next: WarsawSeasonStart) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="relative rounded-xl border border-border bg-surface p-5" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="-m-1 flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-surface/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
          <Calendar className="h-4 w-4 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Сезон</p>
          <p className="text-sm font-bold">{formatWarsawSeason(season)}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
          {WARSAW_SEASON_STARTS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                onChange(y);
                setOpen(false);
              }}
              className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface ${
                y === season ? "bg-accent/5 font-bold text-accent" : ""
              }`}
            >
              {formatWarsawSeason(y)}
              {y === WARSAW_CURRENT_SEASON_START && (
                <span className="ml-2 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  текущий
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── ЧГК ───────────────────────── */

interface ChgkTabProps {
  leagues: ChgkLeagueView[];
  overall: OverallView;
  tours: Tour[];
  matchDetails: Record<string, MatchDetail>;
  sourceHref: string;
  needsPassword: boolean;
  onUnlocked: () => void;
}

function ChgkTab({ leagues, overall, tours, matchDetails, sourceHref, needsPassword, onUnlocked }: ChgkTabProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Микроматчи ЧГК</h2>
        <a href={sourceHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
          micromatches.com <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {needsPassword && <ChgkPasswordField onUnlocked={onUnlocked} />}

      {leagues.map((league, index) => (
        <CrossTableSection
          key={`${league.name}-${index}`}
          title={league.name}
          teams={league.teams}
          matchDetails={matchDetails}
          teamOrder={league.teamOrder}
        />
      ))}
      {overall.teams.length > 0 && (
        <CrossTableSection
          title="Все лиги"
          teams={overall.teams}
          matchDetails={matchDetails}
          teamOrder={overall.teamOrder}
          leagueNames={overall.leagueNames}
        />
      )}

      {tours.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold">Туры</h3>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
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

/** Light tints with dark text. Dark mode remaps these 100-backgrounds, so the text flips with it. */
const LEAGUE_TONES = [
  { cell: "bg-sky-100 text-sky-950 dark:text-sky-100", swatch: "bg-sky-400" },
  { cell: "bg-amber-100 text-amber-950 dark:text-amber-100", swatch: "bg-amber-400" },
  { cell: "bg-violet-100 text-violet-950 dark:text-violet-100", swatch: "bg-violet-400" },
  { cell: "bg-rose-100 text-rose-950 dark:text-rose-100", swatch: "bg-rose-400" },
  { cell: "bg-cyan-100 text-cyan-950 dark:text-cyan-100", swatch: "bg-cyan-400" },
  { cell: "bg-orange-100 text-orange-950 dark:text-orange-100", swatch: "bg-orange-400" },
] as const;

function leagueMark(name: string): string {
  const short = name.replace(/^лига\s+/i, "").trim();
  return short || name;
}

interface CrossTableProps {
  title: string;
  teams: CrossTableTeam[];
  matchDetails: Record<string, MatchDetail>;
  teamOrder: number[];
  /** Parallel to `teams`. Set only on the season-wide table. */
  leagueNames?: string[];
}

function CrossTableSection({ title, teams, matchDetails, teamOrder, leagueNames }: CrossTableProps) {
  const colored = !!leagueNames && leagueNames.length === teams.length;
  const toneByLeague = new Map<string, number>();
  if (colored && leagueNames) {
    for (const name of leagueNames) {
      if (!toneByLeague.has(name)) toneByLeague.set(name, toneByLeague.size);
    }
  }
  function toneAt(index: number) {
    if (!colored || !leagueNames) return null;
    const slot = toneByLeague.get(leagueNames[index]) ?? 0;
    return LEAGUE_TONES[slot % LEAGUE_TONES.length];
  }
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

  useLayoutEffect(() => {
    const el = popupRef.current;
    if (!el || !popup) return;
    const margin = 8;
    const height = el.offsetHeight;
    const width = el.offsetWidth;
    let top = popup.y - height - margin;
    const maxTop = window.innerHeight - height - margin;
    if (top > maxTop) top = maxTop;
    if (top < margin) top = margin;
    const left = Math.max(margin, Math.min(popup.x - width / 2, window.innerWidth - width - margin));
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.transform = "none";
  }, [popup, detail]);

  const legend = colored ? [...toneByLeague.keys()] : [];

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {legend.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
          {legend.map((name) => {
            const tone = LEAGUE_TONES[(toneByLeague.get(name) ?? 0) % LEAGUE_TONES.length];
            return (
              <li key={name} className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${tone.swatch}`} aria-hidden="true" />
                {name}
              </li>
            );
          })}
        </ul>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface" ref={tableRef}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-surface px-2 py-2 text-left font-medium text-muted w-8">М</th>
              <th className="sticky left-8 z-10 bg-surface px-2 py-2 text-left font-medium text-muted min-w-[140px]">Команда</th>
              <th className="px-1.5 py-2 text-center font-medium text-muted w-8">О</th>
              <th className="px-1.5 py-2 text-center font-medium text-muted w-7">В</th>
              <th className="px-1.5 py-2 text-center font-medium text-muted w-7">Н</th>
              <th className="px-1.5 py-2 text-center font-medium text-muted w-7">П</th>
              {teams.map((team, i) => {
                const tone = toneAt(i);
                const league = leagueNames?.[i];
                return (
                  <th
                    key={i}
                    title={tone && league ? `${league}: ${team.name}` : undefined}
                    className={`px-1 py-2 text-center font-medium w-10 ${tone ? tone.cell : "text-muted"}`}
                  >
                    {tone && league ? (
                      <span className="block text-[9px] font-bold leading-tight">{leagueMark(league)}</span>
                    ) : null}
                    {i + 1}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teams.map((team, row) => {
              const tone = toneAt(row);
              const league = leagueNames?.[row];
              return (
              <tr key={row} className="hover:bg-surface/30">
                <td className="sticky left-0 z-10 bg-surface px-2 py-1.5 font-bold text-muted">{row + 1}</td>
                <td
                  className={`sticky left-8 z-10 px-2 py-1.5 font-medium whitespace-nowrap truncate ${tone ? `max-w-[200px] ${tone.cell}` : "max-w-[180px] bg-surface"}`}
                  title={tone && league ? `${league}: ${team.name}` : team.name}
                >
                  {tone && league ? <span className="mr-1 text-[10px] font-bold">{leagueMark(league)}</span> : null}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Popup — rendered as fixed overlay so it's never clipped */}
      {popup && homeResult && (
        <div className="fixed inset-0 z-[100]" onClick={() => setPopup(null)}>
          <div
            ref={popupRef}
            className="absolute w-96 rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-center border-b border-border px-4 py-2.5">
              <span className="text-sm text-muted">Микроматч</span>
              <button onClick={() => setPopup(null)} className="absolute right-3 rounded p-0.5 text-muted hover:text-foreground"><XIcon className="h-4 w-4" /></button>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <p className="flex-1 text-center text-base font-bold leading-tight">{teams[popup.row].name}</p>
                <p className="shrink-0 text-4xl font-bold tabular-nums tracking-tight">{homeResult.replace(":", " : ")}</p>
                <p className="flex-1 text-center text-base font-bold leading-tight">{teams[popup.col].name}</p>
              </div>
            </div>

            {detail && detail.stages.length > 0 && (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto px-3 pb-3">
                {detail.stages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5">
                    <div className="flex w-16 shrink-0 items-center justify-end gap-1.5">
                      {stage.winner === "team1" && <span className="font-bold text-green-600">&#10003;</span>}
                      {stage.winner === "team2" && <span className="font-bold text-red-500">&#10007;</span>}
                      <span className="font-semibold tabular-nums">{stage.team1Score}</span>
                    </div>
                    <p className="flex-1 text-center text-sm font-medium leading-snug">{stage.name}</p>
                    <div className="flex w-16 shrink-0 items-center gap-1.5">
                      <span className="font-semibold tabular-nums">{stage.team2Score}</span>
                      {stage.winner === "team2" && <span className="font-bold text-green-600">&#10003;</span>}
                      {stage.winner === "team1" && <span className="font-bold text-red-500">&#10007;</span>}
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

function ChgkPasswordField({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/warsaw/chgk-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setPassword("");
      onUnlocked();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-surface p-4">
      <label htmlFor="waw27-chgk-password" className="text-sm font-medium">
        Пароль для полных результатов
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="waw27-chgk-password"
          type="password"
          name="password"
          autoComplete="off"
          spellCheck={false}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          aria-invalid={error}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={pending || password.length === 0}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50"
        >
          {pending ? "Проверка…" : "Показать"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">Неверный пароль</p>}
    </form>
  );
}

function KsiTab({ groupA, groupB, sheetHref }: { groupA: KsiTeam[]; groupB: KsiTeam[]; sheetHref: string }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">КСИ</h2>
        <a href={sheetHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
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
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
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
            className="absolute bg-surface rounded-xl shadow-2xl border border-border p-4 min-w-[220px]"
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

      {data.poc.length > 0 && <IsiPocSection rows={data.poc} />}
      {data.crossPlayers.length > 0 && (
        <IsiCrossTableSection players={data.crossPlayers} crossTable={data.crossTable} />
      )}
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
          <div className="mt-3 rounded-lg bg-surface p-3 font-mono text-xs leading-relaxed border border-border">
            <p>margin = |score_A − score_B|</p>
            <p>marginFactor = min(margin / 150, 1.0)</p>
            <p className="mt-1">Победа: credit = str(opp) × (1 + marginFactor)</p>
            <p>Ничья:&nbsp;&nbsp; credit = str(opp) × 0.4</p>
            <p>Пораж.:&nbsp; credit = str(opp) × 0.1 × (1 − marginFactor)</p>
            <p className="mt-1">POC(player) = avg(credits) / max(all_avg_credits) × 1000</p>
          </div>
        </div>
      </details>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
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
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="text-xs whitespace-nowrap border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-1.5 py-2 text-left font-medium text-muted sticky left-0 bg-surface z-10 min-w-[28px]">№</th>
              <th className="px-2 py-2 text-left font-medium text-muted sticky left-7 bg-surface z-10 min-w-[120px]">Игрок</th>
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
                <td className="px-1.5 py-1.5 font-bold text-muted sticky left-0 bg-surface z-[5]">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium sticky left-7 bg-surface z-[5]" title={pA}>
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
            className="absolute bg-surface rounded-xl shadow-2xl border border-border p-4 min-w-[280px] max-h-[70vh] overflow-y-auto"
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
