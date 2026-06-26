import { fetchDsParticipants } from "@/lib/ds-participants";
import {
  applyDsOverrides,
  loadDsOverrides,
  type DsDisplayParticipant,
} from "@/lib/ds-participants-overrides";

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
    a.team.localeCompare(b.team, "ru", { sensitivity: "base" }),
  );
}

export function sortWaitlistByRegistration(
  list: DsDisplayParticipant[],
): DsDisplayParticipant[] {
  return [...list].sort(
    (a, b) => parseRegisteredAt(a.registeredAt) - parseRegisteredAt(b.registeredAt),
  );
}

export function buildDisplayList(participants: DsDisplayParticipant[]): {
  confirmed: DsDisplayParticipant[];
  waitlist: DsDisplayParticipant[];
  displayList: DsDisplayParticipant[];
} {
  const confirmed = sortConfirmedByName(participants.filter((p) => !p.inWaitlist));
  const activeWaitlist = sortWaitlistByRegistration(
    participants.filter((p) => p.inWaitlist && !p.adminRemoved),
  );
  const removedWaitlist = sortWaitlistByRegistration(
    participants.filter((p) => p.inWaitlist && p.adminRemoved),
  );
  const waitlist = [...activeWaitlist, ...removedWaitlist];
  return { confirmed, waitlist, displayList: [...confirmed, ...waitlist] };
}

export function countParticipants(participants: DsDisplayParticipant[]) {
  const { confirmed, waitlist } = buildDisplayList(participants);
  return {
    time: participants.filter((p) => !p.inWaitlist && p.category === "time").length,
    vk: participants.filter((p) => !p.inWaitlist && p.category === "vk").length,
    rating: participants.filter((p) => !p.inWaitlist && p.category === "rating").length,
    ds2: participants.filter((p) => !p.inWaitlist && p.category === "ds2").length,
    confirmed: confirmed.length,
    waitlist: waitlist.length,
  };
}

export async function fetchDsParticipantsForDisplay() {
  const [{ participants, ratingReleaseDate }, overrides] = await Promise.all([
    fetchDsParticipants(),
    loadDsOverrides(),
  ]);
  const withOverrides = applyDsOverrides(participants, overrides);
  return { participants: withOverrides, ratingReleaseDate, overrides };
}
