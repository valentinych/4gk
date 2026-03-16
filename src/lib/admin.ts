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
