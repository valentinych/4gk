export interface OtherTournament {
  href: string;
  emoji: string;
  title: string;
  description: string;
  cities: string[];
  dateLabel: string;
  startDate: string;
  status: "upcoming" | "past";
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
    status: "upcoming",
  },
  {
    href: "/prazma",
    emoji: "🏃",
    title: "Pražma 2026",
    description: "Пражский полумарафон: 15 часов ЧГК.",
    cities: ["Прага"],
    dateLabel: "2 мая 2026",
    startDate: "2026-05-02",
    status: "past",
  },
];
