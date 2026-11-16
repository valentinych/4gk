import { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { fetchPlayerCurrentSeasonTeam, fetchTeam, fetchTeamRating, fetchTeamTown } from "@/lib/chgk";
import { db } from "@/lib/db";
import { isOchp2027Status, type Ochp2027Status } from "@/lib/ochp-2027-status";
import { formatWarsawDateTime, warsawInputValueToIso } from "@/lib/time";

const SETTINGS_ID = "default";

export class Ochp2027HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isOchpDbUnavailable(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1017", "P2021", "P2022"].includes(e.code);
  }
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  return false;
}

type ContactKind = "EMAIL" | "TELEGRAM" | "OTHER";

type DbUser = {
  id: string;
  role: "PLAYER" | "MODERATOR" | "ORGANIZER" | "ADMIN";
  chgkId: number | null;
  email: string | null;
};

export type OchpPublicTeam = {
  id: string;
  teamChgkId: number | null;
  name: string;
  city: string;
  createdAt: string;
  rating: number | null;
  polish: boolean;
  withdrawnAt: string | null;
};

export type OchpAdminContact = {
  id: string;
  contactKind: ContactKind;
  contactValue: string;
};

export type OchpTestTeam = OchpPublicTeam & OchpAdminContact;

export type OchpAdminApplication = {
  id: string;
  teamChgkId: number | null;
  name: string;
  contactKind: ContactKind;
  contactValue: string;
  createdAt: string;
  polishOverride: boolean | null;
  ratingPolish: boolean;
  polish: boolean;
  status: Ochp2027Status | null;
  isTest: boolean;
  withdrawnAt: string | null;
};

export type Ochp2027State = {
  opensAt: string | null;
  open: boolean;
  isAdmin: boolean;
  viewer: {
    loggedIn: boolean;
    email: string | null;
    ownTeamName: string | null;
  };
  teams: OchpPublicTeam[];
  contacts?: OchpAdminContact[];
  testTeams?: OchpTestTeam[];
  adminApplications?: OchpAdminApplication[];
};

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function publicName(teamName: string, displayName: string | null): string {
  const oneTime = displayName?.trim();
  return oneTime || teamName;
}

function closedMessage(opensAt: Date | null): string {
  if (!opensAt) return "Приём заявок ещё не открыт";
  return `Приём заявок откроется ${formatWarsawDateTime(opensAt)} (по варшавскому времени)`;
}

async function sessionUser(session: Session | null): Promise<DbUser | null> {
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, role: true, chgkId: true, email: true },
  });
}

async function readOpensAt(): Promise<Date | null> {
  const row = await db.ochp2027Settings.findUnique({ where: { id: SETTINGS_ID } });
  return row?.opensAt ?? null;
}

function registrationOpen(opensAt: Date | null, now: Date): boolean {
  return opensAt != null && now >= opensAt;
}

type TeamFacts = { city: string; rating: number | null; polish: boolean };

async function loadTeamFacts(ids: Array<number | null>): Promise<Map<number, TeamFacts>> {
  const unique = [
    ...new Set(ids.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)),
  ];
  const pairs = await Promise.all(
    unique.map(async (id) => {
      try {
        const [town, rating] = await Promise.all([fetchTeamTown(id), fetchTeamRating(id)]);
        return [id, { city: town.city || "—", rating, polish: town.polish }] as const;
      } catch {
        return [id, { city: "—", rating: null, polish: false }] as const;
      }
    }),
  );
  return new Map(pairs);
}

function factsFor(teamChgkId: number | null, facts: Map<number, TeamFacts>): TeamFacts {
  if (teamChgkId == null) return { city: "—", rating: null, polish: false };
  return facts.get(teamChgkId) ?? { city: "—", rating: null, polish: false };
}

function effectivePolish(override: boolean | null, ratingPolish: boolean): boolean {
  return override ?? ratingPolish;
}

function storedStatus(value: string | null): Ochp2027Status | null {
  return isOchp2027Status(value) ? value : null;
}

export async function loadOchp2027(session: Session | null): Promise<Ochp2027State> {
  const [user, opensAt, real] = await Promise.all([
    sessionUser(session),
    readOpensAt(),
    db.ochp2027Application.findMany({
      where: { isTest: false },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  const isAdmin = user?.role === "ADMIN";
  const now = new Date();
  const tests = isAdmin
    ? await db.ochp2027Application.findMany({
        where: { isTest: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    : [];

  let ownTeamName: string | null = null;
  const factsPromise = loadTeamFacts([
    ...real.map((row) => row.teamChgkId),
    ...tests.map((row) => row.teamChgkId),
  ]);
  if (user?.chgkId) {
    try {
      const team = await fetchPlayerCurrentSeasonTeam(user.chgkId);
      ownTeamName = team?.teamName ?? null;
    } catch {
      ownTeamName = null;
    }
  }
  const facts = await factsPromise;

  const teams: OchpPublicTeam[] = real.map((row) => {
    const meta = factsFor(row.teamChgkId, facts);
    return {
      id: row.id,
      teamChgkId: row.teamChgkId,
      name: publicName(row.teamName, row.displayName),
      city: meta.city,
      rating: meta.rating,
      polish: effectivePolish(row.polishOverride, meta.polish),
      createdAt: row.createdAt.toISOString(),
      withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
    };
  });

  const state: Ochp2027State = {
    opensAt: opensAt?.toISOString() ?? null,
    open: registrationOpen(opensAt, now),
    isAdmin,
    viewer: {
      loggedIn: Boolean(user),
      email: user?.email?.trim() || null,
      ownTeamName,
    },
    teams,
  };

  if (!isAdmin) return state;

  state.contacts = real.map((row) => ({
    id: row.id,
    contactKind: row.contactKind,
    contactValue: row.contactValue,
  }));
  state.testTeams = tests.map((row) => {
    const meta = factsFor(row.teamChgkId, facts);
    return {
      id: row.id,
      teamChgkId: row.teamChgkId,
      name: publicName(row.teamName, row.displayName),
      city: meta.city,
      rating: meta.rating,
      polish: effectivePolish(row.polishOverride, meta.polish),
      createdAt: row.createdAt.toISOString(),
      withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
      contactKind: row.contactKind,
      contactValue: row.contactValue,
    };
  });
  state.adminApplications = [...real, ...tests]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((row) => {
      const meta = factsFor(row.teamChgkId, facts);
      return {
        id: row.id,
        teamChgkId: row.teamChgkId,
        name: publicName(row.teamName, row.displayName),
        contactKind: row.contactKind,
        contactValue: row.contactValue,
        createdAt: row.createdAt.toISOString(),
        polishOverride: row.polishOverride,
        ratingPolish: meta.polish,
        polish: effectivePolish(row.polishOverride, meta.polish),
        status: storedStatus(row.status),
        isTest: row.isTest,
        withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
      };
    });
  return state;
}

type SubmitBody = {
  source?: unknown;
  teamChgkId?: unknown;
  teamName?: unknown;
  oneTime?: unknown;
  displayName?: unknown;
  contactKind?: unknown;
  contactValue?: unknown;
  useAccountEmail?: unknown;
  test?: unknown;
};

function parseContactKind(value: unknown): ContactKind | null {
  if (value === "email" || value === "EMAIL") return "EMAIL";
  if (value === "telegram" || value === "TELEGRAM") return "TELEGRAM";
  if (value === "other" || value === "OTHER") return "OTHER";
  return null;
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

async function assertRegistrationOpen(): Promise<void> {
  const opensAt = await readOpensAt();
  if (!registrationOpen(opensAt, new Date())) {
    throw new Ochp2027HttpError(403, closedMessage(opensAt));
  }
}

export async function submitOchp2027(session: Session | null, body: SubmitBody): Promise<void> {
  const user = await sessionUser(session);
  const isAdmin = user?.role === "ADMIN";
  const isTest = body.test === true && isAdmin;
  // Test rows are admin-only and stay out of public reads, so they can be filed before opensAt.
  if (!isTest) await assertRegistrationOpen();

  const source = body.source;
  let teamChgkId: number | null = null;
  let teamName = "";
  let notInRating = false;

  if (source === "own") {
    if (!user?.chgkId) {
      throw new Ochp2027HttpError(
        400,
        "Своей командой может заявиться только пользователь с привязанным ID рейтинга",
      );
    }
    const team = await fetchPlayerCurrentSeasonTeam(user.chgkId);
    if (!team) {
      throw new Ochp2027HttpError(
        400,
        "В текущем сезоне рейтинга у вас нет команды. Найдите команду или укажите название",
      );
    }
    teamChgkId = team.teamId;
    teamName = team.teamName;
  } else if (source === "rating") {
    const rawId = body.teamChgkId;
    const id = typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      throw new Ochp2027HttpError(400, "Выберите команду из рейтинга");
    }
    const team = await fetchTeam(id);
    if (!team) {
      throw new Ochp2027HttpError(400, "Команда не найдена в рейтинге");
    }
    teamChgkId = team.id;
    teamName = team.name;
  } else if (source === "free") {
    teamName = cleanText(body.teamName, 200);
    if (!teamName) {
      throw new Ochp2027HttpError(400, "Укажите название команды");
    }
    notInRating = true;
  } else {
    throw new Ochp2027HttpError(400, "Выберите команду");
  }

  const oneTime = body.oneTime === true;
  const displayName = oneTime ? cleanText(body.displayName, 200) : "";
  if (oneTime && !displayName) {
    throw new Ochp2027HttpError(400, "Укажите разовое название");
  }

  const contactKind = parseContactKind(body.contactKind);
  if (!contactKind) {
    throw new Ochp2027HttpError(400, "Укажите один способ связи");
  }

  let contactValue = "";
  if (contactKind === "EMAIL" && body.useAccountEmail === true) {
    const email = user?.email?.trim() ?? "";
    if (!email) {
      throw new Ochp2027HttpError(400, "В аккаунте нет email — введите адрес вручную");
    }
    contactValue = email;
  } else {
    contactValue = cleanText(body.contactValue, contactKind === "EMAIL" ? 320 : 200);
  }

  if (contactKind === "EMAIL" && !validEmail(contactValue)) {
    throw new Ochp2027HttpError(400, "Укажите email");
  }
  if (contactKind !== "EMAIL" && contactValue.length < 2) {
    throw new Ochp2027HttpError(
      400,
      contactKind === "TELEGRAM" ? "Укажите Telegram" : "Укажите другой способ контакта",
    );
  }

  if (!isTest) {
    if (teamChgkId != null) {
      const dup = await db.ochp2027Application.findFirst({
        where: { isTest: false, teamChgkId },
        select: { id: true },
      });
      if (dup) throw new Ochp2027HttpError(409, "Эта команда уже заявилась");
    } else {
      const dup = await db.ochp2027Application.findFirst({
        where: {
          isTest: false,
          notInRating: true,
          teamName: { equals: teamName, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (dup) throw new Ochp2027HttpError(409, "Эта команда уже заявилась");
    }
  }

  await db.ochp2027Application.create({
    data: {
      teamChgkId,
      teamName,
      displayName: displayName || null,
      notInRating,
      contactKind,
      contactValue,
      isTest,
      submittedById: user?.id ?? null,
    },
  });
}

export async function updateOchp2027Application(
  session: Session | null,
  body: { id?: unknown; polishOverride?: unknown; status?: unknown; withdrawn?: unknown },
): Promise<void> {
  const user = await sessionUser(session);
  if (user?.role !== "ADMIN") {
    throw new Ochp2027HttpError(403, "Недостаточно прав");
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) throw new Ochp2027HttpError(400, "Не указана заявка");

  const data: { polishOverride?: boolean | null; status?: string | null; withdrawnAt?: Date | null } = {};
  if ("polishOverride" in body) {
    const value = body.polishOverride;
    if (value !== null && typeof value !== "boolean") {
      throw new Ochp2027HttpError(400, "Укажите, польская ли команда");
    }
    data.polishOverride = value;
  }
  if ("status" in body) {
    const value = body.status;
    if (value === null) {
      data.status = null;
    } else if (isOchp2027Status(value)) {
      data.status = value;
    } else {
      throw new Ochp2027HttpError(400, "Неизвестный статус");
    }
  }
  if ("withdrawn" in body) {
    if (typeof body.withdrawn !== "boolean") {
      throw new Ochp2027HttpError(400, "Укажите, убрать команду из списка или вернуть");
    }
    data.withdrawnAt = body.withdrawn ? new Date() : null;
  }
  if (!("polishOverride" in data) && !("status" in data) && !("withdrawnAt" in data)) {
    throw new Ochp2027HttpError(400, "Нечего сохранять");
  }

  const existing = await db.ochp2027Application.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new Ochp2027HttpError(404, "Заявка не найдена");

  await db.ochp2027Application.update({ where: { id }, data });
}

export async function setOchp2027OpensAt(session: Session | null, opensAtRaw: unknown): Promise<void> {
  const user = await sessionUser(session);
  if (user?.role !== "ADMIN") {
    throw new Ochp2027HttpError(403, "Недостаточно прав");
  }

  let opensAt: Date | null = null;
  if (opensAtRaw != null && opensAtRaw !== "") {
    if (typeof opensAtRaw !== "string") {
      throw new Ochp2027HttpError(400, "Укажите дату и время");
    }
    const iso = warsawInputValueToIso(opensAtRaw);
    if (!iso) throw new Ochp2027HttpError(400, "Укажите дату и время");
    opensAt = new Date(iso);
  }

  await db.ochp2027Settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, opensAt },
    update: { opensAt },
  });
}

export async function deleteOchp2027Tests(
  session: Session | null,
  id: string | null,
  all: boolean,
): Promise<void> {
  const user = await sessionUser(session);
  if (user?.role !== "ADMIN") {
    throw new Ochp2027HttpError(403, "Недостаточно прав");
  }

  if (all) {
    await db.ochp2027Application.deleteMany({ where: { isTest: true } });
    return;
  }

  if (!id) throw new Ochp2027HttpError(400, "Не указана заявка");
  const row = await db.ochp2027Application.findUnique({
    where: { id },
    select: { isTest: true },
  });
  if (!row?.isTest) throw new Ochp2027HttpError(404, "Тестовая заявка не найдена");
  await db.ochp2027Application.delete({ where: { id } });
}
