import type { HazaData, HazaTour } from "./ochp-haza";
import { fetchHazaGameData } from "./ochp-haza";
import {
  SYRENY_LITE_CHGK,
  applySyrenyLiteDisplayName,
  normalizeSyrenyLiteName,
  syrenyLiteChgkSourceUrl,
} from "./syreny-lite";

export interface SyrenyLiteChgkTeam {
  name: string;
  city: string;
  score: number;
  tourScores: number[];
  outOfCompetition: boolean;
  /** null for teams outside the main standings */
  place: number | null;
}

export interface SyrenyLiteChgkData {
  configured: boolean;
  title: string;
  gameId: number | null;
  source: string | null;
  tours: HazaTour[];
  teams: SyrenyLiteChgkTeam[];
  lastQuestion: number;
  totalQuestions: number;
}

function tourScoresFromAnswers(answers: string, tours: HazaTour[]): number[] {
  const scores: number[] = [];
  let offset = 0;
  for (const tour of tours) {
    let s = 0;
    for (let i = 0; i < tour.q; i++) {
      if (answers[offset + i] === "1") s++;
    }
    scores.push(s);
    offset += tour.q;
  }
  return scores;
}

function isHazaTeamOoc(hazaName: string, oocNames: Set<string>): boolean {
  const display = applySyrenyLiteDisplayName(hazaName);
  return (
    oocNames.has(normalizeSyrenyLiteName(display)) ||
    oocNames.has(normalizeSyrenyLiteName(hazaName))
  );
}

function buildChgkData(
  haza: HazaData,
  oocNames: Set<string>,
  gameId: number,
): SyrenyLiteChgkData {
  const totalQuestions = haza.tours.reduce((sum, t) => sum + t.q, 0);

  const rows = haza.teams.map((t) => ({
    name: applySyrenyLiteDisplayName(t.name),
    city: t.city,
    score: t.score,
    tourScores: tourScoresFromAnswers(t.answers, haza.tours),
    outOfCompetition: isHazaTeamOoc(t.name, oocNames),
    hazaPos: t.pos,
  }));

  const main = rows
    .filter((r) => !r.outOfCompetition)
    .sort((a, b) => b.score - a.score || a.hazaPos - b.hazaPos);
  const ooc = rows
    .filter((r) => r.outOfCompetition)
    .sort((a, b) => b.score - a.score || a.hazaPos - b.hazaPos);

  const teams: SyrenyLiteChgkTeam[] = [
    ...main.map((r, i) => ({
      name: r.name,
      city: r.city,
      score: r.score,
      tourScores: r.tourScores,
      outOfCompetition: false,
      place: i + 1,
    })),
    ...ooc.map((r) => ({
      name: r.name,
      city: r.city,
      score: r.score,
      tourScores: r.tourScores,
      outOfCompetition: true,
      place: null,
    })),
  ];

  return {
    configured: true,
    title: SYRENY_LITE_CHGK.title,
    gameId,
    source: syrenyLiteChgkSourceUrl(gameId),
    tours: haza.tours,
    teams,
    lastQuestion: haza.lastQuestion,
    totalQuestions,
  };
}

export function emptySyrenyLiteChgkData(): SyrenyLiteChgkData {
  return {
    configured: false,
    title: SYRENY_LITE_CHGK.title,
    gameId: null,
    source: null,
    tours: [],
    teams: [],
    lastQuestion: 0,
    totalQuestions: 0,
  };
}

export async function loadSyrenyLiteChgkData(
  oocNames: Set<string>,
): Promise<SyrenyLiteChgkData> {
  const gameId = SYRENY_LITE_CHGK.hazaGameId;
  if (gameId == null || gameId <= 0) {
    return emptySyrenyLiteChgkData();
  }

  const haza = await fetchHazaGameData(gameId);
  return buildChgkData(haza, oocNames, gameId);
}
