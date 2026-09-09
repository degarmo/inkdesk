import { PrismaClient } from "@prisma/client";

function assertPostgresUrl() {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) {
    throw new Error("DATABASE_URL is not set. Inkdesk requires PostgreSQL. See README.");
  }
  if (url.startsWith("file:") || /^sqlite:/i.test(url)) {
    throw new Error(
      "DATABASE_URL points at SQLite. Inkdesk no longer uses a SQLite file for the app database. Use Docker Postgres or a Render Postgres URL. See README.",
    );
  }
}

assertPostgresUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
