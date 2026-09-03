import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (user?.role !== "ADMIN") return null;
  return user;
}

export async function requireOrganizer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (user?.role !== "ADMIN" && user?.role !== "ORGANIZER") return null;
  return user;
}

/** Admin or moderator — run live widgets (brain-ring), not site-wide tile CRUD. */
export async function requireModerator() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (user?.role !== "ADMIN" && user?.role !== "MODERATOR") return null;
  return user;
}

export function canRunBrainRing(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "MODERATOR";
}

export function canAssignBrainRingHosts(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "ORGANIZER";
}

export function canScoreBrainRing(
  role: string | undefined | null,
  hostIds: string[],
  userId: string | undefined | null,
): boolean {
  if (canRunBrainRing(role)) return true;
  return Boolean(userId && hostIds.includes(userId));
}

export function brainRingAccess(
  role: string | undefined | null,
  hostIds: string[],
  userId: string | undefined | null,
) {
  return {
    canEditScheme: canRunBrainRing(role),
    canScore: canScoreBrainRing(role, hostIds, userId),
    canAssignHosts: canAssignBrainRingHosts(role),
    canReset: role === "ADMIN",
  };
}
