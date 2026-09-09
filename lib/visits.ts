import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, VISITOR_COOKIE, SESSION_DAYS } from "@/lib/constants";
import { readSession } from "@/lib/session";

const SKIP_PREFIXES = ["/_next", "/api", "/favicon", "/storage"];
const DEDUPE_MS = 3000;

export function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  let path = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (path.length > 180) path = path.slice(0, 180);
  if (SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  if (path.includes("\\")) return null;
  return path || "/";
}

export async function recordVisit(rawPath: unknown) {
  const path = sanitizePath(rawPath);
  if (!path) return { ok: false as const, error: "Invalid path" };

  const jar = await cookies();
  let sessionId = jar.get(VISITOR_COOKIE)?.value;
  if (!sessionId || sessionId.length < 8 || sessionId.length > 80) {
    sessionId = randomUUID();
    jar.set(VISITOR_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60 * 4,
    });
  }

  const shopToken = jar.get(SESSION_COOKIE)?.value;
  const shopSession = shopToken ? await readSession(shopToken) : null;

  let surface: "platform" | "parlor" | "public" = "public";
  let shopId: string | null = null;
  if (path === "/platform" || path.startsWith("/platform/")) {
    surface = "platform";
  } else if (shopSession) {
    surface = "parlor";
    shopId = shopSession.shopId;
  }

  const recent = await prisma.pageView.findFirst({
    where: { sessionId, path },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < DEDUPE_MS) {
    return { ok: true as const, deduped: true };
  }

  await prisma.pageView.create({
    data: { path, shopId, sessionId, surface },
  });
  return { ok: true as const, deduped: false };
}
