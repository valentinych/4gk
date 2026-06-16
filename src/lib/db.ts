import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

// Reuse one client in production (Next.js may load route modules multiple times).
globalForPrisma.prisma = db;
