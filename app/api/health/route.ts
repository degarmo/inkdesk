import { NextResponse } from "next/server";
import { runHealthCheck, type HealthDb } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadPrismaHealthDb(): Promise<HealthDb> {
  const { prisma } = await import("@/lib/prisma");
  return {
    ping: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    countShops: () => prisma.shop.count(),
    countUsers: () => prisma.user.count(),
    countPlatformUsers: () => prisma.platformUser.count(),
    userExists: async (email) => {
      const row = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      return row !== null;
    },
    platformUserExists: async (email) => {
      const row = await prisma.platformUser.findUnique({
        where: { email },
        select: { id: true },
      });
      return row !== null;
    },
  };
}

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");
  const result = await runHealthCheck({
    databaseUrl: process.env.DATABASE_URL,
    email,
    loadDb: loadPrismaHealthDb,
  });
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
