import { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { fetchPlayerCurrentSeasonTeam, fetchTeam } from "@/lib/chgk";
import { db } from "@/lib/db";
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
  name: string;
  createdAt: string;
};

export type OchpAdminContact = {
  id: string;
  contactKind: ContactKind;
  contactValue: string;
};

export type OchpTestTeam = OchpPublicTeam & OchpAdminContact;

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

  let ownTeamName: string | null = null;
  if (user?.chgkId) {
    try {
      const team = await fetchPlayerCurrentSeasonTeam(user.chgkId);
      ownTeamName = team?.teamName ?? null;
    } catch {
      ownTeamName = null;
    }
  }

  const teams: OchpPublicTeam[] = real.map((row) => ({
    id: row.id,
    name: publicName(row.teamName, row.displayName),
    createdAt: row.createdAt.toISOString(),
  }));

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

  const tests = await db.ochp2027Application.findMany({
    where: { isTest: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  state.contacts = real.map((row) => ({
    id: row.id,
    contactKind: row.contactKind,
    contactValue: row.contactValue,
  }));
  state.testTeams = tests.map((row) => ({
    id: row.id,
    name: publicName(row.teamName, row.displayName),
    createdAt: row.createdAt.toISOString(),
    contactKind: row.contactKind,
    contactValue: row.contactValue,
  }));
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
