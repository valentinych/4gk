import { ArrowLeft, MapPin, Clock, ExternalLink, Navigation, Users, Pen, Gavel, Scale, Calendar, Hash } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { fetchHazaBroadcastData } from "@/lib/ochp-haza";
import {
  OCHP_SEASON_START_MAX,
  ochpParticipantsFromRatingSeasons,
  ochpRatingPublicUrl,
  ochpYearSuffix,
  parseOchpSeasonStartOptional,
  resolveOchpChgkHazaBroadcastId,
  resolveOchpRatingTournamentId,
} from "@/lib/ochp-seasons";
import TeamsTable from "./TeamsTable";
import ChgkResults from "./ChgkResults";
import BrainResults from "./BrainResults";
import StormResults from "./StormResults";

const titles: Record<string, string> = {
  "schedule":      "Расписание ОЧП'26",
  "rating-page":   "Страница турнира на сайте рейтинга",
  "participants":  "Список участников ОЧП'26",
  "rules":         "Положение ОЧП'26",
  "results-chgk":  "Результаты Что? Где? Когда?",
  "results-brain":       "Результаты Брэйн-Ринга",
  "results-brain-1-16":  "Брэйн-Ринг: Турнир 01–16",
  "results-brain-17-32": "Брэйн-Ринг: Турнир 17–32",
  "results-brain-33-48": "Брэйн-Ринг: Турнир 33–48",
  "results-storm": "Результаты Мозгового Штурма",
  "appeals":       "Апелляции на ЧГК",
  "sync-signup":   "Заявка на синхрон в пятницу 20.03",
  "rosters":       "Подача составов на ОЧП'26",
  "legionnaires":  "Поиск легионеров на ОЧП'26",
  "food":          "Где поесть рядом с МПИ",
  "excursions":    "Запись на экскурсии по Варшаве",
};

interface ScheduleEvent {
  time: string;
  title: string;
  note?: string;
  regUrl?: string;
  editors?: string[];
}

interface ScheduleDay {
  day: string;
  date: string;
  events: ScheduleEvent[];
}

const schedule: ScheduleDay[] = [
  {
    day: "Пятница",
    date: "20 марта",
    events: [
      { time: "15:00", title: 'Экскурсия «Прогулка в мир Пражских муралов»', note: "сбор около МПИ", regUrl: "https://t.me/chgkpolska/89" },
      { time: "18:00", title: 'Экскурсия «Криминальная Варшава»', note: "сбор около МПИ", regUrl: "https://t.me/chgkpolska/89" },
      { time: "18:00", title: 'Синхронный рейтинговый турнир «Кубок Бесконечности»', note: "Алексей Скуратов, Артём Савочкин, Илья Орлов, Дмитрий Макаров", regUrl: "https://forms.gle/1M2ACrutmUEeWgMt8" },
    ],
  },
  {
    day: "Суббота",
    date: "21 марта",
    events: [
      { time: "10:50–11:00", title: "Открытие" },
      { time: "11:00–14:00", title: "ЧГК — Туры 1–3", editors: ["Николай Лёгенький", "Михаил Иванов", "Максим Мерзляков"] },
      { time: "14:30–19:10", title: '«Мозговой штурм»', note: "1 час на решение в любом месте города в любой промежуток этого времени. Сдать бланк нужно до 19:10" },
      { time: "14:30–16:15", title: "Турнир по Брейн-рингу", note: "для команд с 1 по 16 места ЧГК" },
      { time: "16:30–18:15", title: "Турнир по Брейн-рингу", note: "для команд с 17 по 32 места ЧГК" },
      { time: "18:30–19:10", title: "Первый этап турнира по Брейн-рингу", note: "для команд с 33 по 48 места ЧГК" },
      { time: "19:15–19:30", title: '«Мозговой штурм» — чтение ответов' },
      { time: "19:30–21:30", title: "Турнир по чёрному ЧГК", note: "30 вопросов" },
    ],
  },
  {
    day: "Воскресенье",
    date: "22 марта",
    events: [
      { time: "10:00–10:50", title: "Второй и финальный этапы турнира по Брейн-рингу", note: "для команд с 33–48 места ЧГК" },
      { time: "11:10–15:00", title: "ЧГК — Туры 4–7", editors: ["Михаил Карпук", "Александр Мерзликин", "Антон Саксонов", "Александр Рождествин"] },
      { time: "15:00–15:30", title: "Апелляции, возможная перестрелка", note: "по необходимости" },
      { time: "15:30–16:00", title: "Награждение команд, закрытие турнира" },
    ],
  },
];

function SchedulePage() {
  return (
    <div className="space-y-6">
      <a
        href="https://maps.app.goo.gl/tGTPPGV5MvFHvS988"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-accent/30 hover:bg-accent/5"
      >
        <MapPin className="h-5 w-5 text-accent shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">МПИ: Centrum Kreatywności Targowa</p>
          <p className="text-xs text-muted">Targowa 56, 03-733 Warszawa</p>
        </div>
        <Navigation className="h-4 w-4 text-muted shrink-0" />
      </a>

      <div className="flex items-center gap-1 text-xs text-muted">
        <span>Источник:</span>
        <a
          href="https://docs.google.com/document/d/151nZq37dJAgUCyPcmE2BP9aqb09EhEeOchg4_hHZ0CI"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          Google Docs <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {schedule.map((day) => (
        <div key={day.date} className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="bg-accent/5 border-b border-border px-5 py-3">
            <h3 className="text-sm font-bold">{day.day}, {day.date}</h3>
          </div>
          <div className="divide-y divide-border">
            {day.events.map((ev, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5">
                <div className="flex items-start gap-1.5 shrink-0 w-28">
                  <Clock className="h-3.5 w-3.5 text-muted mt-0.5 shrink-0" />
                  <span className="text-xs font-mono font-semibold text-muted whitespace-nowrap">{ev.time}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{ev.title}</p>
                  {ev.note && <p className="text-xs text-muted mt-0.5">{ev.note}</p>}
                  {ev.editors && (
                    <ol className="mt-1.5 space-y-0.5">
                      {ev.editors.map((name, ei) => {
                        const tourStartNum = ev.title.includes("1–3") ? 1 : 4;
                        return (
                          <li key={ei} className="text-xs text-muted">
                            <span className="font-mono text-muted/60">{tourStartNum + ei}.</span>{" "}
                            {name}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  {ev.regUrl && (
                    <a
                      href={ev.regUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-accent/90"
                    >
                      РЕГИСТРАЦИЯ
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  /** Прогноз сложности (целое на сайте рейтинга) */
  difficultyForecast: number;
  /** Фактическая сложность по TrueDL; `null`, пока не рассчитана (см. API `tournaments/:id`) */
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
      `https://api.rating.chgk.info/tournaments/${tournamentId}/results?includeTeamMembers=1`,
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

function PersonList({ title, icon, people }: { title: string; icon: React.ReactNode; people: Person[] }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
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

/** Как на rating.chgk.info — десятичная точка, до 5 знаков после запятой */
function formatTrueDl(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
    useGrouping: false,
  }).format(value);
}

async function RatingPage({ tournamentId }: { tournamentId: number }) {
  const { tournament: t, teams } = await fetchTournament(tournamentId);

  const totalQuestions = Object.values(t.questionQty).reduce((a, b) => a + b, 0);
  const tourCount = Object.keys(t.questionQty).length;
  const questionsPerTour = Object.values(t.questionQty)[0] ?? 0;

  const isPastTournament = new Date(t.dateEnd).getTime() < Date.now();
  const teamCount = teams.length;
  const teamsLabel = isPastTournament
    ? `${teamCount}/${teamCount}`
    : `${teamCount}/48`;

  const alphabeticalTeams = [...teams].sort((a, b) =>
    a.current.name.localeCompare(b.current.name, "ru"),
  );

  const dateStart = new Date(t.dateStart);
  const dateEnd = new Date(t.dateEnd);
  const dateStr = `${dateStart.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} – ${dateEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <a
        href={ochpRatingPublicUrl(tournamentId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors"
      >
        Открыть на rating.chgk.info <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Даты</span>
          </div>
          <p className="text-sm font-bold">{dateStr}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Hash className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Формат</span>
          </div>
          <p className="text-sm font-bold">{tourCount} туров × {questionsPerTour} вопросов = {totalQuestions}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">Команды</span>
          </div>
          <p className="text-sm font-bold">{teamsLabel}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
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
        <PersonList title="Редакторы" icon={<Pen className="h-4 w-4 text-muted" />} people={t.editors} />
        <PersonList title="Игровое жюри" icon={<Gavel className="h-4 w-4 text-muted" />} people={t.gameJury} />
        <PersonList title="Апелляционное жюри" icon={<Scale className="h-4 w-4 text-muted" />} people={t.appealJury} />
      </div>

      <TeamsTable teams={alphabeticalTeams} />
    </div>
  );
}

interface Participant {
  /** Номер в протоколе (может быть дробным при ничьих) */
  pos: number;
  name: string;
  city: string;
  /** Зачёт ЧСт в трансляции haza (gr = 0) */
  isPL: boolean;
}

interface RatingResultRow {
  team: { id: number };
  current: { name: string; town: { name: string } };
  questionsTotal: number | null;
  position: number;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

async function fetchParticipants(): Promise<Participant[]> {
  const url = "https://docs.google.com/spreadsheets/d/1xjvuOacGapp9zx0UQbaKijmoB5-w5pXCC31qMDl0few/export?format=csv&gid=0";
  const text = await fetch(url, { next: { revalidate: 3600 } }).then((r) => r.text());
  const rows: Participant[] = [];

  for (const line of text.split("\n")) {
    const cells = parseCsvLine(line);
    const c0 = cells[0] ?? "";
    if (!/^\d+$/.test(c0)) continue;
    const name = cells[1]?.trim() ?? "";
    const city = cells[2]?.trim() ?? "";
    if (!name) continue;
    const isPL = cells.some((c) => c.trim() === "PL");
    rows.push({ pos: parseInt(c0, 10), name, city, isPL });
  }
  return rows;
}

/**
 * Список участников из rating.chgk.info + зачёт ЧСт из той же трансляции haza, что и таблица результатов.
 */
async function fetchParticipantsFromRatingArchive(
  tournamentId: number,
  hazaBroadcastId: number,
): Promise<Participant[]> {
  const [res, hazaData] = await Promise.all([
    fetch(
      `https://api.rating.chgk.info/tournaments/${tournamentId}/results?includeTeamMembers=0`,
      { next: { revalidate: 3600 } },
    ),
    fetchHazaBroadcastData(hazaBroadcastId),
  ]);
  if (!res.ok) return [];
  const results: RatingResultRow[] = await res.json();
  const sortName = (s: string) => s.toLocaleLowerCase("ru");
  const hazaSorted = [...hazaData.teams].sort((a, b) => {
    if (a.pos !== b.pos) return a.pos - b.pos;
    return sortName(a.name).localeCompare(sortName(b.name), "ru");
  });
  const apiSorted = [...results].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
    }
    return sortName(a.current.name).localeCompare(
      sortName(b.current.name),
      "ru",
    );
  });
  if (
    hazaSorted.length !== apiSorted.length ||
    hazaSorted.some(
      (h, i) => apiSorted[i].questionsTotal !== h.score,
    )
  ) {
    return apiSorted.map((a) => ({
      pos: a.position,
      name: a.current.name,
      city: a.current.town.name,
      isPL: false,
    }));
  }
  return apiSorted.map((a, i) => ({
    pos: a.position,
    name: a.current.name,
    city: a.current.town.name,
    isPL: hazaSorted[i].group === 0,
  }));
}

function PolishFlag() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border border-border overflow-hidden shrink-0"
      title="Зачёт ЧСт"
    >
      <span className="block w-full h-1/2 bg-white" />
      <span className="block w-full h-1/2 bg-red-500" />
    </span>
  );
}

async function ParticipantsPage({
  seasonStart,
}: {
  seasonStart: number | null;
}) {
  const fromRating =
    seasonStart != null &&
    ochpParticipantsFromRatingSeasons().includes(seasonStart);
  const tournamentId = resolveOchpRatingTournamentId(seasonStart);
  const hazaId = resolveOchpChgkHazaBroadcastId(seasonStart);

  const participants = fromRating
    ? await fetchParticipantsFromRatingArchive(tournamentId, hazaId)
    : await fetchParticipants();
  const plCount = participants.filter((p) => p.isPL).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Всего команд: <strong>{participants.length}</strong>, зачёт ЧСт:{" "}
          <strong>{plCount}</strong>
        </p>
        {fromRating ? (
          <a
            href={ochpRatingPublicUrl(tournamentId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            rating.chgk.info <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <a
            href="https://docs.google.com/spreadsheets/d/1xjvuOacGapp9zx0UQbaKijmoB5-w5pXCC31qMDl0few"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Google Sheets <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left font-medium w-10">№</th>
              <th className="px-3 py-2.5 text-left font-medium">Команда</th>
              <th className="px-3 py-2.5 text-left font-medium">Город</th>
              <th className="px-3 py-2.5 text-center font-medium w-10" title="Зачёт ЧСт">
                PL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {participants.map((p) => (
              <tr
                key={`${p.pos}-${p.name}`}
                className="hover:bg-surface/50"
              >
                <td className="px-3 py-2.5 text-muted font-mono">{p.pos}</td>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap">{p.name}</td>
                <td className="px-3 py-2.5 text-muted whitespace-nowrap">{p.city}</td>
                <td className="px-3 py-2.5 text-center">{p.isPL && <PolishFlag />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const rulesContent = {
  title: 'Положение о VII Открытом Чемпионате Польши по спортивному \u201CЧто? Где? Когда?\u201D и \u201CБрэйн-рингу\u201D',
  sections: [
    {
      items: [
        '1. Сроки проведения Чемпионата Польши по спортивному \u201CЧто? Где? Когда?\u201D, \u201CБрэйн-рингу\u201D (далее\u00A0\u2014 чемпионат) 20\u201322 марта 2026 года.',
        '2. Для проведения чемпионата образуется Оргкомитет в составе: Александр Лапко, Павел Забавский, Юрий Разумов, Руслан Огородник.',
        '3. Оргкомитет действует в соответствии с Положением чемпионата.',
        '4. К участию в чемпионате допускаются команды, подавшие заявку в установленный Оргкомитетом срок, и уплатившие игровой взнос.',
      ],
    },
    {
      heading: '5. Зачёты чемпионата',
      items: [
        'В чемпионате предусмотрены три зачёта:',
      ],
      bullets: [
        { bold: 'Общий', text: 'Играют все команды, принимающие участие в чемпионате.' },
        { bold: 'Польский', text: 'Играют все команды, удовлетворяющие пункту положения 5.1.' },
      ],
      after: [
        '5.1. К участию в зачёте \u201CПольский\u201D допускаются команды (за столом не более 6 человек, допускается один запасной), в составе которых игроки (допускается один игрок, который не соответствует условиям перечисленным далее) являются резидентами Республики Польша: гражданами Польши; лицами, имеющими либо постоянный вид на жительство, либо временный вид на жительство, защиту/оборону, статус UKR, либо национальную польскую визу типа D и постоянно проживающими в Польше. Оргкомитет оставляет за собой право как на рассмотрение исключительных случаев в частном порядке, так и на проверку подтверждающих документов во время чемпионата.',
      ],
    },
    {
      heading: '5.2. \u201CЧто? Где? Когда?\u201D',
      items: [
        '5.2.1. В чемпионате\u00A0\u2014 105 вопросов. Команда, давшая наибольшее количество правильных ответов по итогам 105 вопросов (вне зависимости от зачёта), объявляется победителем общего зачёта чемпионата Польши. Команда, давшая наибольшее количество правильных ответов в зачёте \u201CПольский\u201D, объявляется победителем зачёта \u201CПольский\u201D чемпионата.',
        '5.2.2. В случае равенства правильных ответов у команд, не претендующих на призовые места, считается, что они разделили все соответствующие места.',
        '5.2.3. Редакторы:',
      ],
      editors: [
        'Александр Мерзликин',
        'Михаил Карпук',
        'Максим Мерзляков',
        'Николай Лёгенький',
        'Михаил Иванов',
        'Александр Рождествин',
        'Антон Саксонов',
      ],
      after: [
        '5.2.4. В случае равенства очков у команд, претендующих на призовые места, назначается «перестрелка». «Перестрелка» состоит из трёх вопросов. Команда, давшая большее количество ответов по итогам «перестрелки», занимает более высокое место.',
        '5.2.5. Если три дополнительных вопроса не выявили призовые места, далее вопросы «перестрелки» задаются по одному по следующей схеме: из любых команд, участвующих в дележе одного и того же места, команда, давшая правильный ответ на очередной вопрос, занимает или делит место выше, чем команда, давшая неправильный ответ на тот же вопрос. Команда завершает участие в «перестрелке», когда либо определено её место, если это место входит в число первых трёх мест, либо определено, что команда занимает место ниже третьего. Перестрелка завершается либо когда определены все три первых места, либо после пяти вопросов. Места, не определённые перестрелкой, определяются рейтингом после 105 вопросов.',
      ],
    },
    {
      heading: '5.3. Апелляции',
      items: [
        '5.3.1. Апелляции рассматриваются Апелляционным жюри (АЖ) в составе трёх человек. Разрешены апелляции обоих типов.',
        '5.3.2. Апелляции подаются секретарю АЖ в течение 15 минут после окончания последнего тура игрового дня и только на вопросы данного игрового дня. Апелляции на вопросы «перестрелки» не принимаются.',
        '5.3.3. Апелляционный залог устанавливается Оргкомитетом и оглашается до начала турнира.',
        '5.3.4. АЖ удовлетворяет апелляции простым большинством. Вопрос признаётся некорректным при наличии существенной фактической ошибки.',
      ],
    },
    {
      heading: '5.5. Турнир по \u201CБрэйн-рингу\u201D',
      items: [
        '5.5.1. Каждая игра проводится на 5 или 9 вопросах. Время обсуждения вопроса\u00A0\u2014 30 секунд.',
        '5.5.2. Началом розыгрыша вопроса считается объявление номера вопроса, началом обсуждения\u00A0\u2014 сигнал брейн-системы, поданный после команды «Время». Звуковые сигналы, поданные командами в промежутке между этими моментами, считаются фальстартами.',
        '5.5.3. Право ответа на вопрос получает команда, первой подавшая звуковой сигнал после начала времени обсуждения. В случае неправильного ответа команды её соперник получает 15 секунд на обсуждение вопроса. В случае фальстарта, команда соперник получает 30 секунд.',
        '5.5.4. Капитан отвечающей команды обязан объявить отвечающего, если это не он сам. Не засчитываются ответы, данные с нарушением этого правила, а также ответы, данные более чем одним игроком команды.',
        '5.5.5. Турнир по \u201CБрэйн-рингу\u201D проводится в три зачёта:',
      ],
      brDashes: [
        'для команд, занявших 1\u201316 места по итогам первого игрового дня \u201CЧто? Где? Когда?\u201D.',
        'для команд, занявших 17\u201332 места по итогам первого игрового дня \u201CЧто? Где? Когда?\u201D.',
        'для команд, занявших 33\u201348 места по итогам первого игрового дня \u201CЧто? Где? Когда?\u201D.',
      ],
      after: [
        'В каждом зачёте турнир состоит из отборочных, групповых и финальных этапов.',
        '5.5.6. Составы групповых этапов определяются жеребьёвкой с предварительным посевом по корзинам, согласно результатам первого игрового дня ЧГК.',
        '5.5.7. На отборочном этапе формируются группы по 4 команды, которые играют туры по 5 вопросов. В групповой этап выходят по 2 лучшие команды каждой группы.',
        '5.5.8. На групповом этапе формируются 2 группы по 4 команды. В финальный этап выходят по 2 лучшие команды каждой группы.',
        '5.5.9. На финальном этапе играются полуфинальные бои (7 вопросов), бой за третье место (9 вопросов), финал (9 вопросов).',
        '5.5.10. Основным показателем при распределении мест в групповых этапах является количество очков. Принцип начисления очков:',
      ],
      scoring: [
        'за победу\u00A0\u2014 3 очка',
        'за ненулевую ничью\u00A0\u2014 2 очка',
        'за ненулевое поражение\u00A0\u2014 1 очко',
        'за нулевые поражение или ничью\u00A0\u2014 0 очков',
      ],
      after2: [
        '5.5.10. Дополнительные показатели в порядке убывания значимости: результат личной встречи, разница «забитых-пропущенных», количество «забитых». В случае равенства очков более чем у двух команд в качестве личной встречи выступают все 4 показателя (в том же порядке приоритета) для условного мини-турнира, включающего все игры этих команд на данном этапе между собой. Если при этом один из показателей определил место одной из команд, для остальных процесс распределения мест начинается с начала без учёта этой команды.',
        '5.5.11. В случае равенства основного и дополнительных показателей у команд, спорящих за выход из группы, между ними проводится дополнительный раунд до первого правильного ответа. Если таких команд более двух, между ними всеми проводится микро-турнир, каждая игра которого состоит из 1 вопроса, итоги микро-турнира подводятся по аналогии с итогами основного кругового турнира. В случае, когда по итогам микро-турнира места команд не определены, он повторяется заново для продолжающих спорить команд.',
        '5.5.12. Протест рассматривает ведущий зала, в котором он подан. Протест подаётся в устном виде до начала розыгрыша следующего вопроса. При возникновении спорной ситуации игрок излагает суть протеста. Ведущий останавливает игру до вынесения вердикта, в ходе рассмотрения протеста он может консультироваться с другими компетентными людьми. Решение по протесту действует только в той игре, в которой он был подан.',
        '5.5.13. Протест на снятие удовлетворяется в случае существенной ошибки в вопросе или действиях ведущего.',
      ],
    },
    {
      heading: 'Общие положения',
      items: [
        '6. Состав редакторской группы, игрового и апелляционного жюри утверждается Оргкомитетом.',
        '7. Результаты чемпионата публикуются в течение двух дней после завершения чемпионата.',
        '8. Детали организации чемпионата, не содержащиеся в настоящем Положении, публикуются как Дополнение к Положению.',
        '9. Оперативные решения по вопросам, не урегулированным в настоящем Положении и других действующих на чемпионате документах, принимаются Оргкомитетом.',
      ],
    },
  ],
};

function RulesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Положение чемпионата</p>
        <a
          href="https://docs.google.com/document/d/1MV4WauNTvxlkjl64qblH8E48TcpTTCMD03gZ_MVMZcc"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Google Docs <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 sm:p-8">
        <h2 className="text-lg font-bold leading-snug mb-6">
          {rulesContent.title}
        </h2>

        {rulesContent.sections.map((sec, si) => (
          <div key={si} className="mb-6 last:mb-0">
            {sec.heading && (
              <h3 className="text-base font-bold mt-6 mb-3">{sec.heading}</h3>
            )}

            {sec.items?.map((item, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/90 mb-2">
                {item}
              </p>
            ))}

            {sec.bullets?.map((b, i) => (
              <div key={i} className="ml-4 mb-2 flex items-start gap-2">
                <span className="text-accent mt-1.5 text-xs">●</span>
                <p className="text-sm leading-relaxed">
                  <strong>{b.bold}.</strong> {b.text}
                </p>
              </div>
            ))}

            {sec.editors?.map((name, i) => (
              <div key={i} className="ml-4 mb-1 flex items-start gap-2">
                <span className="text-muted mt-1.5 text-xs">●</span>
                <p className="text-sm">{name}</p>
              </div>
            ))}

            {sec.after?.map((item, i) => (
              <p key={`a${i}`} className="text-sm leading-relaxed text-foreground/90 mb-2">
                {item}
              </p>
            ))}

            {sec.brDashes?.map((item, i) => (
              <div key={i} className="ml-4 mb-1 flex items-start gap-2">
                <span className="text-muted mt-0.5">\u2013</span>
                <p className="text-sm leading-relaxed">{item}</p>
              </div>
            ))}

            {sec.scoring && (
              <div className="ml-4 mt-2 mb-3 space-y-1">
                {sec.scoring.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-muted mt-0.5">\u2013</span>
                    <p className="text-sm">{s}</p>
                  </div>
                ))}
              </div>
            )}

            {sec.after2?.map((item, i) => (
              <p key={`a2${i}`} className="text-sm leading-relaxed text-foreground/90 mb-2">
                {item}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const brainTiles = [
  { slug: "results-brain-1-16",  title: "Турнир 01–16",  desc: "Команды, занявшие 1–16 места по итогам ЧГК" },
  { slug: "results-brain-17-32", title: "Турнир 17–32",  desc: "Команды, занявшие 17–32 места по итогам ЧГК" },
  { slug: "results-brain-33-48", title: "Турнир 33–48",  desc: "Команды, занявшие 33–48 места по итогам ЧГК" },
];

function ochpSubpageHeading(slug: string, seasonStart: number | null): string {
  if (seasonStart != null && slug === "participants") {
    return `Список участников ОЧП'${ochpYearSuffix(seasonStart)}`;
  }
  return titles[slug] ?? slug;
}

function BrainSubTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {brainTiles.map((t) => (
        <Link
          key={t.slug}
          href={`/ochp/${t.slug}`}
          className="group rounded-xl border border-border bg-white p-6 transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-0.5"
        >
          <span className="text-3xl leading-none">🧠</span>
          <h3 className="mt-3 text-sm font-bold group-hover:text-accent transition-colors">
            {t.title}
          </h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">{t.desc}</p>
        </Link>
      ))}
    </div>
  );
}

export default async function OchpSubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const seasonForRating = parseOchpSeasonStartOptional(sp.season);
  const ratingTournamentId = resolveOchpRatingTournamentId(seasonForRating);
  const chgkHazaId = resolveOchpChgkHazaBroadcastId(seasonForRating);
  const title = ochpSubpageHeading(slug, seasonForRating);
  const seasonForNav =
    seasonForRating != null &&
    (slug === "rating-page" ||
      slug === "results-chgk" ||
      slug === "participants")
      ? seasonForRating
      : null;
  const logoYear = seasonForRating ?? OCHP_SEASON_START_MAX;

  const ochpBackHref = slug.startsWith("results-brain-")
    ? "/ochp/results-brain"
    : seasonForNav != null
      ? `/ochp?season=${seasonForNav}`
      : "/ochp";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href={ochpBackHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {slug.startsWith("results-brain-") ? "Назад к Брэйн-Рингу" : "Назад к ОЧП"}
      </Link>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <Image
          src="/ochp-logo.png"
          alt={`ОЧП'${ochpYearSuffix(logoYear)}`}
          width={56}
          height={70}
          className="shrink-0 hidden sm:block"
        />
      </div>

      {slug === "schedule" ? (
        <SchedulePage />
      ) : slug === "rating-page" ? (
        <RatingPage tournamentId={ratingTournamentId} />
      ) : slug === "participants" ? (
        <ParticipantsPage seasonStart={seasonForRating} />
      ) : slug === "rules" ? (
        <RulesPage />
      ) : slug === "results-chgk" ? (
        <ChgkResults broadcastId={chgkHazaId} />
      ) : slug === "results-brain" ? (
        <BrainSubTiles />
      ) : slug === "results-brain-1-16" ? (
        <BrainResults tier="1-16" />
      ) : slug === "results-brain-17-32" ? (
        <BrainResults tier="17-32" />
      ) : slug === "results-brain-33-48" ? (
        <BrainResults tier="33-48" />
      ) : slug === "results-storm" ? (
        <StormResults />
      ) : slug === "food" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <a
              href="https://drive.google.com/file/d/1xXHIw8giOiGCqFe-HOnEaV2sJUsjBUND/view"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Открыть в Google Drive <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <iframe
              src="https://drive.google.com/file/d/1xXHIw8giOiGCqFe-HOnEaV2sJUsjBUND/preview"
              className="w-full"
              style={{ height: "80vh" }}
              allow="autoplay"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">Содержимое появится скоро</p>
        </div>
      )}

      <div className="mt-12 flex justify-center">
        <Image
          src="/ochp-sponsors.png"
          alt="Партнёры ОЧП'26"
          width={700}
          height={50}
          className=""
        />
      </div>
    </div>
  );
}
