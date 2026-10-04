/**
 * CSV формата tournament-tours для ОЧЧ: те же колонки и диалект, что у Pražma
 * (`prague-tournament-csv.ts`). Блоки по турам, глобальные номера вопросов.
 * Табло нумерует вопросы сквозь туры, по 15 в каждом из 7 туров (1–105).
 */

import { filterOchchChgkBoardTeams } from "./ochch-board";
import { OCHCH_CHGK_TOURS, OCHCH_TEAMS } from "./ochch";
import type { PragueTeamRow } from "./prague-stats";

/** Как `defaultQuestionsPerTour` у загрузчика табло ОЧЧ. */
const QUESTIONS_PER_TOUR = 15;

const HIDDEN_TEAM_CHGK_ID = 105474;
const HIDDEN_SLOT = 2;

export interface OchchCsvPayload {
  teams: PragueTeamRow[];
  tours: { questionCount: number }[];
}

/** Тур × диапазон глобальных номеров: 1–15, 16–30, …, 91–105. */
export const OCHCH_TOURNAMENT_SEGMENTS = OCHCH_CHGK_TOURS.map((_, i) => {
  const start = i * QUESTIONS_PER_TOUR + 1;
  return {
    tourNum: i + 1,
    start,
    end: start + QUESTIONS_PER_TOUR - 1,
  };
});

function csvEscape(field: string): string {
  if (/[",\n\r]/.test(field)) return `"${field.replace(/"/g, '""')}"`;
  return field;
}

function csvRow(fields: string[]): string {
  return fields.map(csvEscape).join(",");
}

/** Team ID — id на rating.chgk.info; иначе номер строки табло. */
function teamIdFor(team: PragueTeamRow): string {
  if (team.teamChgkId != null && team.teamChgkId > 0) {
    return String(team.teamChgkId);
  }
  return team.number?.trim() ?? "";
}

/** Сначала состав ОЧЧ по номеру стола (без слота 2), затем команды вне состава. */
function orderTeamsLikeRoster(teams: PragueTeamRow[]): PragueTeamRow[] {
  const visible = filterOchchChgkBoardTeams(teams);
  const byId = new Map<number, PragueTeamRow>();
  for (const t of visible) {
    if (t.teamChgkId != null) byId.set(t.teamChgkId, t);
  }
  const out: PragueTeamRow[] = [];
  const used = new Set<number>();
  for (const row of OCHCH_TEAMS) {
    if (row.number === HIDDEN_SLOT || row.teamChgkId === HIDDEN_TEAM_CHGK_ID) {
      continue;
    }
    const t = byId.get(row.teamChgkId);
    if (!t) continue;
    out.push(t);
    used.add(row.teamChgkId);
  }
  for (const t of visible) {
    if (t.teamChgkId != null && used.has(t.teamChgkId)) continue;
    out.push(t);
  }
  return out;
}

function markAt(team: PragueTeamRow, tourIdx: number, localIdx: number): "0" | "1" {
  const v = team.tours[tourIdx]?.marks[localIdx];
  return v === true ? "1" : "0";
}

/** Построить CSV целиком (без BOM — BOM добавляет route). */
export function buildOchchTournamentToursCsv(payload: OchchCsvPayload): string {
  const teams = orderTeamsLikeRoster(payload.teams);
  const lines: string[] = [];

  for (const seg of OCHCH_TOURNAMENT_SEGMENTS) {
    const nCols = seg.end - seg.start + 1;
    const width = 4 + nCols;
    const tourIdx = seg.tourNum - 1;

    lines.push(csvRow(Array(width).fill("")));

    const headerFields = [
      "Team ID",
      "Название",
      "Город",
      "Тур",
      ...Array.from({ length: nCols }, (_, i) => String(seg.start + i)),
    ];
    lines.push(csvRow(headerFields));

    for (const team of teams) {
      const row: string[] = [
        teamIdFor(team),
        team.team,
        team.city,
        String(seg.tourNum),
      ];
      for (let local = 0; local < nCols; local++) {
        row.push(markAt(team, tourIdx, local));
      }
      lines.push(csvRow(row));
    }
  }

  return lines.join("\r\n");
}
