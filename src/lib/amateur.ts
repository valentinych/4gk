export interface AmateurTournament {
  /** Path to the tournament's own page, e.g. "/mazowieckie-syreny-lite" */
  href: string;
  /** Optional emoji icon used in cards */
  emoji: string;
  /** Display title */
  title: string;
  /** Short description shown on the hub */
  description: string;
  /** Cities for the badge row */
  cities: string[];
  /** Human-readable date label, e.g. "6–7 июня 2026" */
  dateLabel: string;
  /** Sort key — ISO date string of the tournament start */
  startDate: string;
  /** Whether the tournament is upcoming or in the past */
  status: "upcoming" | "past";
}

export const AMATEUR_TOURNAMENTS: AmateurTournament[] = [
  {
    href: "/mazowieckie-syreny-lite",
    emoji: "🧜‍♀️",
    title: "Syrenki Mazowieckie Lite",
    description: "Двухдневный турнир для начинающих команд: КСИ, Б-52, Брейн-Ринг, ЭК, Чёрное ЧГК, Островок Бесконечности.",
    cities: ["Варшава"],
    dateLabel: "6–7 июня 2026",
    startDate: "2026-06-06",
    status: "upcoming",
  },
  {
    href: "/koziolki-wielkopolskie-lite",
    emoji: "🐐",
    title: "Koziołki Wielkopolskie Lite",
    description: "Однодневный турнир в Познани: КСИ, ЧГК (B-52 + Островок Бесконечности), Брейн-ринг.",
    cities: ["Познань"],
    dateLabel: "28 февраля 2026",
    startDate: "2026-02-28",
    status: "past",
  },
];
