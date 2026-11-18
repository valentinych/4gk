/**
 * Allow/deny check for OCHB tour editors. No test runner in this repo.
 * Run: node --experimental-strip-types scripts/check-ochb-tour-editors.ts
 */
import {
  OCHB_TOUR_EDITORS,
  canModerateOchbQuestion,
  ochbTourRangeForPlayer,
  scopeForOchbModerator,
} from "../src/lib/ochb-tour-editors.ts";

const KSENIA_SHAGAL = 16329;
const EDUARD_SHAGAL = 35385;
const VAHRIV = 5224;
/** gameJury of tournament 14496 who are not tour editors, fetched 18 Nov 2026. */
const JURY_NOT_EDITOR = [6366, 326965];
/** appealJury of the same tournament. Must not moderate спорные. */
const APPEAL_JURY = [10448, 11084, 32901];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function scope(
  playerId: number | null,
  opts: { isSiteAdmin?: boolean; isGameJury?: boolean } = {},
) {
  return scopeForOchbModerator({
    isSiteAdmin: opts.isSiteAdmin ?? false,
    playerId,
    isGameJury: opts.isGameJury ?? false,
  });
}

function allowed(
  playerId: number | null,
  questionNumber: number | null,
  opts: { isSiteAdmin?: boolean; isGameJury?: boolean } = {},
) {
  return canModerateOchbQuestion(scope(playerId, opts), questionNumber);
}

for (const tour of OCHB_TOUR_EDITORS) {
  assert(tour.to - tour.from + 1 === 15, `tour ${tour.tour} is not 15 questions`);
  for (const editor of tour.editors) {
    const juryAndEditor = { isGameJury: true };
    assert(
      allowed(editor.id, tour.from, juryAndEditor),
      `${editor.surname} should allow ${tour.from}`,
    );
    assert(
      allowed(editor.id, tour.to, juryAndEditor),
      `${editor.surname} should allow ${tour.to}`,
    );
    assert(
      !allowed(editor.id, tour.from - 1, juryAndEditor),
      `${editor.surname} should deny ${tour.from - 1}`,
    );
    assert(
      !allowed(editor.id, tour.to + 1, juryAndEditor),
      `${editor.surname} should deny ${tour.to + 1}`,
    );
    assert(
      !allowed(editor.id, null, juryAndEditor),
      `${editor.surname} should deny a missing question number`,
    );
    assert(
      ochbTourRangeForPlayer(editor.id)?.from === tour.from &&
        ochbTourRangeForPlayer(editor.id)?.to === tour.to,
      `${editor.surname} range`,
    );
  }
}

for (const id of [KSENIA_SHAGAL, EDUARD_SHAGAL]) {
  const asJury = { isGameJury: true };
  assert(allowed(id, 76, asJury), `${id} allow 76`);
  assert(allowed(id, 90, asJury), `${id} allow 90`);
  assert(!allowed(id, 75, asJury), `${id} deny 75`);
  assert(!allowed(id, 91, asJury), `${id} deny 91`);
  assert(!allowed(id, 10, asJury), `${id} deny 10`);
}

assert(allowed(VAHRIV, 1, { isGameJury: true }), "Вахрив allow 1");
assert(allowed(VAHRIV, 15, { isGameJury: true }), "Вахрив allow 15");
assert(!allowed(VAHRIV, 16, { isGameJury: true }), "Вахрив deny 16");

assert(allowed(null, 1, { isSiteAdmin: true }), "ADMIN with no rating id allow 1");
assert(allowed(null, 90, { isSiteAdmin: true }), "ADMIN with no rating id allow 90");
assert(allowed(KSENIA_SHAGAL, 1, { isSiteAdmin: true, isGameJury: true }), "ADMIN overrides Шагал on 1");
assert(allowed(KSENIA_SHAGAL, 90, { isSiteAdmin: true, isGameJury: true }), "ADMIN overrides Шагал on 90");

for (const juryOnlyId of JURY_NOT_EDITOR) {
  assert(ochbTourRangeForPlayer(juryOnlyId) == null, `${juryOnlyId} is not a tour editor`);
  assert(allowed(juryOnlyId, 1, { isGameJury: true }), `${juryOnlyId} jury allow 1`);
  assert(allowed(juryOnlyId, 90, { isGameJury: true }), `${juryOnlyId} jury allow 90`);
  assert(scope(juryOnlyId, { isGameJury: false }) == null, `${juryOnlyId} without jury is not a moderator`);
}

for (const appealId of APPEAL_JURY) {
  assert(ochbTourRangeForPlayer(appealId) == null, `${appealId} appeal jury is not a tour editor`);
  assert(!allowed(appealId, 1), `${appealId} appeal jury deny 1`);
  assert(!allowed(appealId, 90), `${appealId} appeal jury deny 90`);
}

console.log("question field: questionNumber");
for (const tour of OCHB_TOUR_EDITORS) {
  for (const editor of tour.editors) {
    console.log(
      `${editor.id}\tтур ${tour.tour}\t${editor.name} ${editor.surname}\t${tour.from}–${tour.to}`,
    );
  }
}
console.log("allow/deny: ok");
