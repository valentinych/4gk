import { ArrowLeft, Calendar, ExternalLink, Gavel, Hash, Pen, Scale, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ratingChgkResultsQuery } from "@/lib/chgk-tournament-results";
import {
  TURNIRUSHKI,
  findTurnirushkaBySlug,
  ratingTournamentUrl,
  turnirushkaLabel,
} from "@/lib/turnirushki";
import TeamsTable from "@/app/ochp/[slug]/TeamsTable";
import ChgkRatingApiResults from "@/app/ochp/[slug]/ChgkRatingApiResults";
import { getKsiAmateurTeamNames, getKsiResults } from "@/lib/turnirushki-ksi";
import KsiResultsTable from "./KsiResultsTable";

const titles: Record<string, string> = {
  "rating-page": "Страница турнира на сайте рейтинга",
  "results-chgk": "Результаты Что? Где? Когда?",
  ksi: "КСИ (Командная Своя Игра)",
};

interface Person {
  id: number;
  name: string;
  patronymic: string;
  surname: string;
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
      <div className="flex items-center gap-2 mb-3">
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
            className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium hover:bg-accent/10 hover:text-accent transition-colors"
          >
            {personName(p)}
          </a>
        ))}
      </div>
    </div>
  );
}

function formatTrueDl(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
    useGrouping: false,
  }).format(value);
}

function formatDateRange(startIso: string, endIso: string): string {
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return fmt.format(start);
  return `${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(start)} – ${fmt.format(end)}`;
}

async function RatingPage({ tournamentId }: { tournamentId: number }) {
  const { tournament: t, teams } = await fetchTournament(tournamentId);

  const totalQuestions = Object.values(t.questionQty ?? {}).reduce(
    (a, b) => a + b,
    0,
  );
  const tourCount = Object.keys(t.questionQty ?? {}).length;
  const questionsPerTour = Object.values(t.questionQty ?? {})[0] ?? 0;
  const teamCount = teams.length;
  const alphabeticalTeams = [...teams].sort((a, b) =>
    a.current.name.localeCompare(b.current.name, "ru"),
  );
  const dateStr = t.dateStart && t.dateEnd ? formatDateRange(t.dateStart, t.dateEnd) : "—";

  return (
    <div className="space-y-6">
      <a
        href={ratingTournamentUrl(tournamentId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors"
      >
        Открыть на rating.chgk.info <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Даты</span>
          </div>
          <p className="text-sm font-bold">{dateStr}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <Hash className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Формат</span>
          </div>
          <p className="text-sm font-bold">
            {tourCount > 0
              ? `${tourCount} туров × ${questionsPerTour} вопросов = ${totalQuestions}`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Команды</span>
          </div>
          <p className="text-sm font-bold">{teamCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted">Сложность</span>
          </div>
          <p className="text-sm font-bold leading-snug">
            <span className="block">Прогноз {t.difficultyForecast ?? "—"}</span>
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
        <PersonList title="Редакторы" icon={<Pen className="h-4 w-4 text-muted" />} people={t.editors} />
        <PersonList title="Игровое жюри" icon={<Gavel className="h-4 w-4 text-muted" />} people={t.gameJury} />
        <PersonList title="Апелляционное жюри" icon={<Scale className="h-4 w-4 text-muted" />} people={t.appealJury} />
      </div>

      <TeamsTable teams={alphabeticalTeams} />
    </div>
  );
}

export async function generateStaticParams() {
  return Object.keys(titles).map((slug) => ({ slug }));
}

export default async function TurnirushkiSubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!(slug in titles)) notFound();

  const current = findTurnirushkaBySlug(sp.t);
  const backHref =
    sp.t && TURNIRUSHKI.some((t) => t.slug === sp.t)
      ? `/turnirushki?t=${sp.t}`
      : "/turnirushki";
  const title = titles[slug];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Турнирушкам
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">
          {turnirushkaLabel(current)} · {current.dateLabel}
        </p>
      </div>

      {slug === "rating-page" ? (
        <RatingPage tournamentId={current.ratingTournamentId} />
      ) : slug === "results-chgk" ? (
        <ChgkRatingApiResults
          tournamentId={current.ratingTournamentId}
          amateurTeamNames={getKsiAmateurTeamNames(current.slug)}
        />
      ) : slug === "ksi" ? (
        (() => {
          const ksi = getKsiResults(current.slug);
          if (!ksi) {
            return (
              <div className="rounded-xl border border-border bg-surface px-6 py-14 text-center">
                <p className="text-base font-medium text-foreground">
                  Для этого турнира нет данных по КСИ
                </p>
              </div>
            );
          }
          return <KsiResultsTable data={ksi} />;
        })()
      ) : null}
    </div>
  );
}
