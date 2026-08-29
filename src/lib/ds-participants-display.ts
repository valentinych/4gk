import { fetchDsParticipants } from "@/lib/ds-participants";
import {
  applyDsOverrides,
  loadDsOverrides,
  type DsDisplayParticipant,
} from "@/lib/ds-participants-overrides";
import { db } from "@/lib/db";
import { DS_MAIN_EVENT_ID } from "@/lib/dziki-sopot-seasons";

export function participantShownName(
  p: Pick<DsDisplayParticipant, "displayName" | "team">,
): string {
  return p.displayName || p.team;
}

export function parseRegisteredAt(raw: string): number {
  if (!raw.trim()) return Number.POSITIVE_INFINITY;
  const parts = raw.trim().split(" ");
  const [day, month, year] = (parts[0] ?? "").split(".").map(Number);
  const [hh = 0, mm = 0, ss = 0] = (parts[1] ?? "0:0:0").split(":").map(Number);
  if (!day || !month || !year) return Number.POSITIVE_INFINITY;
  return new Date(year, month - 1, day, hh, mm, ss).getTime();
}

export function sortConfirmedByName(list: DsDisplayParticipant[]): DsDisplayParticipant[] {
  return [...list].sort((a, b) =>
    participantShownName(a).localeCompare(participantShownName(b), "ru", { sensitivity: "base" }),
  );
}

type EventTeamNameRow = {
  id: string;
  teamChgkId: number;
  teamName: string;
  displayName: string | null;
};

function normTeamName(s: string): string {
  return s.trim().toLowerCase();
}

/** Overlay EventTeam.displayName from the main DS calendar event onto sheet rows. */
function applyEventTeamNames(
  participants: DsDisplayParticipant[],
  teams: EventTeamNameRow[],
): DsDisplayParticipant[] {
  const byChgkId = new Map<number, EventTeamNameRow>();
  const byName = new Map<string, EventTeamNameRow>();
  for (const t of teams) {
    if (t.teamChgkId > 0 && !byChgkId.has(t.teamChgkId)) byChgkId.set(t.teamChgkId, t);
    for (const raw of [t.teamName, t.displayName]) {
      if (!raw) continue;
      const key = normTeamName(raw);
      if (!byName.has(key)) byName.set(key, t);
    }
  }

  return participants.map((p) => {
    const et =
      p.teamId > 0
        ? byChgkId.get(p.teamId)
        : byName.get(normTeamName(p.team));
    if (!et) return p;
    return {
      ...p,
      eventTeamId: et.id,
      displayName: et.displayName,
      officialName: et.teamName || p.team,
    };
  });
}

function compareByRating(a: DsDisplayParticipant, b: DsDisplayParticipant): number {
  const posA = a.ratingPosition ?? a.rating ?? Number.POSITIVE_INFINITY;
  const posB = b.ratingPosition ?? b.rating ?? Number.POSITIVE_INFINITY;
  if (posA !== posB) return posA - posB;
  const scoreCmp = (b.ratingScore ?? 0) - (a.ratingScore ?? 0);
  if (scoreCmp !== 0) return scoreCmp;
  return parseRegisteredAt(a.registeredAt) - parseRegisteredAt(b.registeredAt);
}

export function sortWaitlistByRating(list: DsDisplayParticipant[]): DsDisplayParticipant[] {
  return [...list].sort(compareByRating);
}

export function buildDisplayList(participants: DsDisplayParticipant[]): {
  confirmed: DsDisplayParticipant[];
  waitlist: DsDisplayParticipant[];
  displayList: DsDisplayParticipant[];
} {
  const confirmed = sortConfirmedByName(participants.filter((p) => !p.inWaitlist));
  const activeWaitlist = sortWaitlistByRating(
    participants.filter((p) => p.inWaitlist && !p.adminRemoved),
  );
  const removedWaitlist = sortWaitlistByRating(
    participants.filter((p) => p.inWaitlist && p.adminRemoved),
  );
  const waitlist = [...activeWaitlist, ...removedWaitlist];
  return { confirmed, waitlist, displayList: [...confirmed, ...waitlist] };
}

export function countParticipants(participants: DsDisplayParticipant[]) {
  const { confirmed, waitlist } = buildDisplayList(participants);
  const activeWaitlist = waitlist.filter((p) => !p.adminRemoved);
  return {
    time: participants.filter((p) => !p.inWaitlist && p.category === "time").length,
    vk: participants.filter((p) => !p.inWaitlist && p.category === "vk").length,
    rating: participants.filter((p) => !p.inWaitlist && p.category === "rating").length,
    ds2: participants.filter((p) => !p.inWaitlist && p.category === "ds2").length,
    confirmed: confirmed.length,
    waitlist: activeWaitlist.length,
    total: confirmed.length + activeWaitlist.length,
  };
}

export async function fetchDsParticipantsForDisplay() {
  const [{ participants, ratingReleaseDate }, overrides, eventTeams] = await Promise.all([
    fetchDsParticipants(),
    loadDsOverrides(),
    db.eventTeam.findMany({
      where: { eventId: DS_MAIN_EVENT_ID },
      select: { id: true, teamChgkId: true, teamName: true, displayName: true },
    }),
  ]);
  const withOverrides = applyDsOverrides(participants, overrides);
  const withNames = applyEventTeamNames(withOverrides, eventTeams);
  return { participants: withNames, ratingReleaseDate, overrides };
}

/** Confirmed + active waitlist, same total as /dziki-sopot/participants. */
export async function countDsMainEventTeams(): Promise<number> {
  const { participants } = await fetchDsParticipantsForDisplay();
  return countParticipants(participants).total;
}
