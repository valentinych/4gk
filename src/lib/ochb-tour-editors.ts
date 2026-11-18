/**
 * Tour editors of rating.chgk.info tournament 14496.
 * Ids and names confirmed against GET /tournaments/14496 on 18 Nov 2026.
 * `editorGroups` is one flat list of all nine ids, not a per-tour split,
 * so question ranges follow the published tour list (OCHB_EDITORS).
 * This module stays free of the database client so the allow/deny check can run on its own.
 */

export interface OchbTourEditor {
  /** rating.chgk.info player id. */
  id: number;
  name: string;
  surname: string;
}

export interface OchbTourEditorAssignment {
  tour: number;
  /** Inclusive global question number. Packet numbering is 1–90. */
  from: number;
  to: number;
  editors: readonly OchbTourEditor[];
}

export const OCHB_TOUR_EDITORS: readonly OchbTourEditorAssignment[] = [
  {
    tour: 1,
    from: 1,
    to: 15,
    editors: [{ id: 5224, name: "Тарас", surname: "Вахрив" }],
  },
  {
    tour: 2,
    from: 16,
    to: 30,
    editors: [{ id: 46788, name: "Александр", surname: "Мерзликин" }],
  },
  {
    tour: 3,
    from: 31,
    to: 45,
    editors: [
      { id: 170136, name: "Фёдор", surname: "Журавлёв" },
      { id: 175974, name: "Филипп", surname: "Тучак" },
    ],
  },
  {
    tour: 4,
    from: 46,
    to: 60,
    editors: [{ id: 101861, name: "Дмитрий", surname: "Стальнухин" }],
  },
  {
    tour: 5,
    from: 61,
    to: 75,
    editors: [
      { id: 10509, name: "Александр", surname: "Ермишкин" },
      { id: 36035, name: "Алексей", surname: "Шередега" },
    ],
  },
  {
    tour: 6,
    from: 76,
    to: 90,
    editors: [
      { id: 16329, name: "Ксения", surname: "Шагал" },
      { id: 35385, name: "Эдуард", surname: "Шагал" },
    ],
  },
];

const RANGE_BY_PLAYER_ID = new Map<number, { from: number; to: number }>(
  OCHB_TOUR_EDITORS.flatMap((tour) =>
    tour.editors.map((editor) => [editor.id, { from: tour.from, to: tour.to }]),
  ),
);

export function ochbTourRangeForPlayer(
  playerId: number,
): { from: number; to: number } | null {
  return RANGE_BY_PLAYER_ID.get(playerId) ?? null;
}

/** `all` is the whole packet, including a missing question number. */
export type OchbControversialQuestionScope =
  | { kind: "all" }
  | { kind: "range"; from: number; to: number };

/**
 * Site ADMIN sees every question. A tour editor is limited to that tour even
 * when they are also on the game jury. Game jury outside the tour map keeps
 * the full list. Anyone else is not a moderator.
 */
export function scopeForOchbModerator(input: {
  isSiteAdmin: boolean;
  playerId: number | null;
  isGameJury: boolean;
}): OchbControversialQuestionScope | null {
  if (input.isSiteAdmin) return { kind: "all" };
  if (input.playerId != null) {
    const range = ochbTourRangeForPlayer(input.playerId);
    if (range) return { kind: "range", from: range.from, to: range.to };
  }
  if (input.isGameJury) return { kind: "all" };
  return null;
}

/** Missing question numbers stay with full-access moderators and are hidden from a tour. */
export function canModerateOchbQuestion(
  scope: OchbControversialQuestionScope | null,
  questionNumber: number | null | undefined,
): boolean {
  if (!scope) return false;
  if (scope.kind === "all") return true;
  if (typeof questionNumber !== "number" || !Number.isInteger(questionNumber)) {
    return false;
  }
  return questionNumber >= scope.from && questionNumber <= scope.to;
}

export function ochbQuestionNumberWhere(scope: OchbControversialQuestionScope): {
  questionNumber?: { gte: number; lte: number };
} {
  if (scope.kind === "all") return {};
  return { questionNumber: { gte: scope.from, lte: scope.to } };
}
