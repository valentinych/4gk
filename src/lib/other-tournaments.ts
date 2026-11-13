import { warsawDateString } from "@/lib/time";

export interface OtherTournament {
  href: string;
  emoji: string;
  title: string;
  description: string;
  cities: string[];
  dateLabel: string;
  /** Inclusive YYYY-MM-DD. */
  startDate: string;
  /** Inclusive YYYY-MM-DD. One-day events use the same day as startDate. */
  endDate: string;
}

/** Hub listing for «Другие турниры». */
export const OTHER_TOURNAMENTS: OtherTournament[] = [
  {
    href: "/ochch",
    emoji: "🇨🇿",
    title: "ОЧЧ-2026",
    description:
      "Открытый Чемпионат Чехии по Что? Где? Когда? — фестиваль в Праге.",
    cities: ["Прага"],
    dateLabel: "3–4 октября 2026",
    startDate: "2026-10-03",
    endDate: "2026-10-04",
  },
  {
    href: "/ochb",
    emoji: "🇪🇸",
    title: "ОЧБ-2026",
    description: "I Открытый Чемпионат Барселоны.",
    cities: ["Барселона"],
    dateLabel: "20–22 ноября 2026",
    startDate: "2026-11-20",
    endDate: "2026-11-22",
  },
  {
    href: "/prazma",
    emoji: "🏃",
    title: "Pražma 2026",
    description: "Пражский полумарафон: 15 часов ЧГК.",
    cities: ["Прага"],
    dateLabel: "2 мая 2026",
    startDate: "2026-05-02",
    endDate: "2026-05-02",
  },
];

/** Past only when the Warsaw calendar date is strictly after endDate. */
export function isOtherTournamentPast(
  tournament: Pick<OtherTournament, "endDate">,
  today = warsawDateString(),
): boolean {
  return today > tournament.endDate;
}

export function splitOtherTournaments(
  tournaments: readonly OtherTournament[] = OTHER_TOURNAMENTS,
  today = warsawDateString(),
): { upcoming: OtherTournament[]; past: OtherTournament[] } {
  const upcoming = tournaments
    .filter((t) => !isOtherTournamentPast(t, today))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = tournaments
    .filter((t) => isOtherTournamentPast(t, today))
    .sort((a, b) => b.endDate.localeCompare(a.endDate));
  return { upcoming, past };
}
