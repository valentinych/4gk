import { PRAZMA_TEAMS } from "./prazma";
import {
  OCHCH_TEAMS,
  normalizeOchchTeamName,
  ochchInviteFor,
  type OchchImportedTeam,
} from "./ochch";
import type { PraguePayload, PragueTeamRow } from "./prague-stats";

export type OchchNameMatch = {
  teamChgkId: number;
  name: string;
  number: number;
  city: string;
};

function stripLeadingDecor(s: string): string {
  return s.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function addNameKey(
  map: Map<string, OchchNameMatch>,
  raw: string,
  hit: OchchNameMatch,
) {
  const keys = [raw, stripLeadingDecor(raw)];
  for (const rawKey of keys) {
    const key = normalizeOchchTeamName(rawKey);
    if (key && !map.has(key)) map.set(key, hit);
  }
}

/** Index display names, official PRAZMA names (same teamChgkId), and slot-26 display. */
export function buildOchchNameIndex(
  participants: readonly OchchImportedTeam[],
): Map<string, OchchNameMatch> {
  const map = new Map<string, OchchNameMatch>();
  const officialById = new Map(PRAZMA_TEAMS.map((t) => [t.teamChgkId, t.name]));

  const remember = (t: OchchImportedTeam) => {
    const hit: OchchNameMatch = {
      teamChgkId: t.teamChgkId,
      name: t.name,
      number: t.number,
      city: t.city,
    };
    addNameKey(map, t.name, hit);
    const official = officialById.get(t.teamChgkId);
    if (official) addNameKey(map, official, hit);
  };

  for (const t of participants) remember(t);
  for (const t of OCHCH_TEAMS) remember(t);
  return map;
}

export function matchOchchSheetTeamName(
  sheetName: string,
  index: Map<string, OchchNameMatch>,
): OchchNameMatch | null {
  const keys = [sheetName, stripLeadingDecor(sheetName)];
  for (const raw of keys) {
    const hit = index.get(normalizeOchchTeamName(raw));
    if (hit) return hit;
  }
  return null;
}

export function ochchParticipantHref(teamChgkId: number): string {
  return `/ochch/participants#ochch-team-${teamChgkId}`;
}

/** Slot 2 on the OCHCH roster. Off the tablo and out of question ratings. */
const OCHCH_HIDDEN_CHGK_TEAM_ID = 105474;
const OCHCH_HIDDEN_CHGK_SLOT = 2;

/** «Short & Sweet» / «Short and Sweet», after ё→е, trim, and a leading slot number. */
function isShortAndSweetName(raw: string): boolean {
  const name = normalizeOchchTeamName(raw)
    .replace(/^\d+\s*[.)-]?\s*/u, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u0400-\u04ff]+/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name === "short and sweet";
}

function sheetTeamSlot(number: string): number | null {
  const m = number.trim().match(/^0*(\d+)$/);
  if (!m) return null;
  return Number(m[1]);
}

function isOchchHiddenChgkRow(
  row: PragueTeamRow,
  hit: OchchNameMatch | null,
): boolean {
  if (
    isShortAndSweetName(row.team) ||
    (hit != null && isShortAndSweetName(hit.name))
  ) {
    return true;
  }
  if (hit?.teamChgkId !== OCHCH_HIDDEN_CHGK_TEAM_ID) return false;
  return (
    hit.number === OCHCH_HIDDEN_CHGK_SLOT ||
    sheetTeamSlot(row.number) === OCHCH_HIDDEN_CHGK_SLOT
  );
}

/** Same rows the CHGK tablo drops (Short & Sweet, slot 2, team id 105474). */
export function filterOchchChgkBoardTeams(
  teams: PragueTeamRow[],
): PragueTeamRow[] {
  const index = buildOchchNameIndex(OCHCH_TEAMS);
  return teams.filter((row) => {
    const byId =
      row.teamChgkId != null
        ? (Array.from(index.values()).find(
            (h) => h.teamChgkId === row.teamChgkId,
          ) ?? null)
        : null;
    const hit = byId ?? matchOchchSheetTeamName(row.team, index);
    return !isOchchHiddenChgkRow(row, hit);
  });
}

/** Same tie labels as the live sheet, on the teams that remain. */
function assignCompetitionPlaces(teams: PragueTeamRow[]): PragueTeamRow[] {
  const out: PragueTeamRow[] = [];
  for (let i = 0; i < teams.length; ) {
    let j = i + 1;
    while (j < teams.length && teams[j].total === teams[i].total) j++;
    const label = j > i + 1 ? `${i + 1}-${j}` : `${i + 1}`;
    for (let k = i; k < j; k++) out.push({ ...teams[k], place: label });
    i = j;
  }
  return out;
}

/** Replace matched sheet names with official OCHCH display names; mark Czech / amateur. */
export function applyOchchBoardTeams(
  payload: PraguePayload,
  participants: readonly OchchImportedTeam[],
  amateurIds: ReadonlySet<number>,
): PraguePayload {
  const index = buildOchchNameIndex(participants);
  const teams: PragueTeamRow[] = [];
  for (const row of payload.teams) {
    const hit = matchOchchSheetTeamName(row.team, index);
    // Question rating is (minuses + 1) over every row. Dropping the team
    // keeps its minuses out of that sum and off every standings view.
    if (isOchchHiddenChgkRow(row, hit)) continue;
    if (!hit) {
      teams.push(row);
      continue;
    }
    const invite = ochchInviteFor(hit);
    teams.push({
      ...row,
      team: hit.name,
      href: ochchParticipantHref(hit.teamChgkId),
      teamChgkId: hit.teamChgkId,
      czech: invite.czech,
      amateur: amateurIds.has(hit.teamChgkId),
    });
  }
  return { ...payload, teams: assignCompetitionPlaces(teams) };
}
