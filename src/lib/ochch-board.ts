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

/** Replace matched sheet names with official OCHCH display names; mark Czech / amateur. */
export function applyOchchBoardTeams(
  payload: PraguePayload,
  participants: readonly OchchImportedTeam[],
  amateurIds: ReadonlySet<number>,
): PraguePayload {
  const index = buildOchchNameIndex(participants);
  const teams: PragueTeamRow[] = payload.teams.map((row) => {
    const hit = matchOchchSheetTeamName(row.team, index);
    if (!hit) return row;
    const invite = ochchInviteFor(hit);
    return {
      ...row,
      team: hit.name,
      href: ochchParticipantHref(hit.teamChgkId),
      czech: invite.czech,
      amateur: amateurIds.has(hit.teamChgkId),
    };
  });
  return { ...payload, teams };
}
