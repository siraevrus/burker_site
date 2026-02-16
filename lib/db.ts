import { PrismaClient } from "@prisma/client";

// Защита от выполнения в браузере
if (typeof window !== "undefined") {
  throw new Error(
    "PrismaClient is unable to run in this browser environment. " +
    "Please ensure that Prisma is only imported in server-side code."
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
