import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Gavel,
  Hash,
  Pen,
  Scale,
  Users,
} from "lucide-react";
import {
  DS_ARCHIVE_YEARS,
  type DsArchiveYear,
  dsRatingPublicUrl,
  dsYearLabel,
  isArchiveYear,
  parseDsYear,
  resolveDsTournamentId,
} from "@/lib/dziki-sopot-seasons";
import { formatOchpTournamentDateRange } from "@/lib/ochp-seasons";
import { ratingChgkResultsQuery } from "@/lib/chgk-tournament-results";
import ChgkRatingApiResults from "@/app/ochp/[slug]/ChgkRatingApiResults";
import TeamsTable from "@/app/ochp/[slug]/TeamsTable";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ year?: string }>;
};

const PAGE_TITLES: Record<string, string> = {
  "rating-page":  "Страница турнира на сайте рейтинга",
  "results-chgk": "Результаты Что? Где? Когда?",
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const year = parseDsYear(sp.year);
  const label = year ? dsYearLabel(year) : "Dziki Sopot";
  const title = PAGE_TITLES[slug] ?? slug;
  return { title: `${title} — ${label}` };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Person {
  id: number;
  name: string;
  patronymic: string;
  surname: string;
}

interface TeamMember {
  flag: string;
  player: { id: number; name: string; patronymic: string; surname: string };
}

interface TeamResult {
  team: { id: number; name: string; town: { name: string } };
  current: { name: string; town: { name: string } };
  questionsTotal: number | null;
  position: number;
  teamMembers?: TeamMember[];
}

interface TournamentData {
  id: number;
  name: string;
  dateStart: string;
  dateEnd: string;
  difficultyForecast: number;
  trueDL: number | null;
  questionQty: Record<string, number>;
  orgcommittee: Person[];
  editors: Person[];
  gameJury: Person[];
  appealJury: Person[];
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchTournament(
  tournamentId: number,
): Promise<{ tournament: TournamentData; teams: TeamResult[] }> {
  const [tRes, rRes] = await Promise.all([
    fetch(`https://api.rating.chgk.info/tournaments/${tournamentId}`, {
      next: { revalidate: 3600 },
    }),
    fetch(
      `https://api.rating.chgk.info/tournaments/${tournamentId}/results?${ratingChgkResultsQuery(1)}`,
      { next: { revalidate: 3600 } },
    ),
  ]);
  const tournament = await tRes.json();
  const teams = await rRes.json();
  return { tournament, teams };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function formatTrueDl(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
    useGrouping: false,
  }).format(value);
}

function personName(p: Person) {
  return `${p.name} ${p.surname}`;
}

function PersonList({
  title,
  icon,
  people,
}: {
  title: string;
  icon: React.ReactNode;
  people: Person[];
}) {
  if (!people?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p) => (
          <a
            key={p.id}
            href={`https://rating.chgk.info/players/${p.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent/10 hover:text-accent"
          >
            {personName(p)}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Rating page ──────────────────────────────────────────────────────────────

async function RatingPage({ tournamentId }: { tournamentId: number }) {
  const { tournament: t, teams } = await fetchTournament(tournamentId);

  const totalQuestions = Object.values(t.questionQty).reduce((a, b) => a + b, 0);
  const tourCount = Object.keys(t.questionQty).length;
  const questionsPerTour = Object.values(t.questionQty)[0] ?? 0;

  const isPast = new Date(t.dateEnd).getTime() < Date.now();
  const teamCount = Array.isArray(teams) ? teams.length : 0;
  const teamsLabel = isPast ? `${teamCount}/${teamCount}` : String(teamCount);

  const dateStr = formatOchpTournamentDateRange(t.dateStart, t.dateEnd);

  const alphabeticalTeams = Array.isArray(teams)
    ? [...teams].sort((a, b) => a.current.name.localeCompare(b.current.name, "ru"))
    : [];

  return (
    <div className="space-y-6">
      <a
        href={dsRatingPublicUrl(tournamentId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
      >
        Открыть на rating.chgk.info <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Даты</span>
          </div>
          <p className="text-sm font-bold">{dateStr}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-1 flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Формат</span>
          </div>
          <p className="text-sm font-bold">
            {tourCount} туров × {questionsPerTour} вопросов = {totalQuestions}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-1 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Команды</span>
          </div>
          <p className="text-sm font-bold">{teamsLabel}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs text-muted">Сложность</span>
          </div>
          <p className="text-sm font-bold leading-snug">
            <span className="block">Прогноз {t.difficultyForecast}</span>
            {t.trueDL != null && (
              <span className="mt-1 block text-xs font-semibold text-muted">
                TrueDL {formatTrueDl(t.trueDL)}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PersonList title="Оргкомитет" icon={<Users className="h-4 w-4 text-muted" />} people={t.orgcommittee} />
        <PersonList title="Редакторы"  icon={<Pen   className="h-4 w-4 text-muted" />} people={t.editors} />
        <PersonList title="Игровое жюри" icon={<Gavel className="h-4 w-4 text-muted" />} people={t.gameJury} />
        <PersonList title="Апелляционное жюри" icon={<Scale className="h-4 w-4 text-muted" />} people={t.appealJury} />
      </div>

      <TeamsTable teams={alphabeticalTeams} />
    </div>
  );
}

// ─── Year switcher ────────────────────────────────────────────────────────────

function YearSwitcher({ slug, activeYear }: { slug: string; activeYear: DsArchiveYear }) {
  return (
    <div className="flex gap-1.5">
      {DS_ARCHIVE_YEARS.map((y) => (
        <Link
          key={y}
          href={`/dziki-sopot/${slug}?year=${y}`}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            y === activeYear
              ? "bg-accent text-white"
              : "border border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground"
          }`}
        >
          {dsYearLabel(y)}
        </Link>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DzikiSopotSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const parsedYear = parseDsYear(sp.year);
  const year: DsArchiveYear = (parsedYear && isArchiveYear(parsedYear) ? parsedYear : DS_ARCHIVE_YEARS[0]);
  const tournamentId = resolveDsTournamentId(year);
  const title = PAGE_TITLES[slug] ?? slug;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/dziki-sopot"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Dziki Sopot
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {(slug === "rating-page" || slug === "results-chgk") && (
          <YearSwitcher slug={slug} activeYear={year} />
        )}
      </div>

      {slug === "rating-page" ? (
        <RatingPage tournamentId={tournamentId} />
      ) : slug === "results-chgk" ? (
        <ChgkRatingApiResults tournamentId={tournamentId} />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">Страница не найдена</p>
          <Link href="/dziki-sopot" className="mt-3 inline-block text-sm text-accent hover:underline">
            Вернуться на главную Dziki Sopot
          </Link>
        </div>
      )}
    </div>
  );
}
