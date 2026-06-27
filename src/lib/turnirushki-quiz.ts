import drovushki2024 from "./turnirushki/quiz/drovushki-exportnye-2024.json";
import sugrobushki2024 from "./turnirushki/quiz/sugrobushki-2024.json";
import sugrobushki2026 from "./turnirushki/quiz/sugrobushki-2026.json";

export interface QuizTeam {
  position: number;
  number: number;
  name: string;
  region: string;
  total: number;
  scores: number[];
  amateur?: boolean;
}

export interface QuizResults {
  tournamentSlug: string;
  title: string;
  questionCount: number;
  source: string;
  teams: QuizTeam[];
}

const ALL: Record<string, QuizResults> = {
  [drovushki2024.tournamentSlug]: drovushki2024 as QuizResults,
  [sugrobushki2024.tournamentSlug]: sugrobushki2024 as QuizResults,
  [sugrobushki2026.tournamentSlug]: sugrobushki2026 as QuizResults,
};

export function getQuizResults(tournamentSlug: string): QuizResults | null {
  return ALL[tournamentSlug] ?? null;
}

export function hasQuizResults(tournamentSlug: string): boolean {
  return tournamentSlug in ALL;
}
