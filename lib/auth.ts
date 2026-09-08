import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";
import { prisma } from "./prisma";

const EXPIRE_PATH = "/session/expire";

export type LiveSession = SessionUser & { role: string; active: boolean };

async function loadLiveUser(session: SessionUser) {
  const [user, shop] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id } }),
    prisma.shop.findUnique({ where: { id: session.shopId } }),
  ]);
  if (!user || !shop || user.shopId !== session.shopId || !user.active) {
    return null;
  }
  return {
    session: {
      ...session,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    } satisfies LiveSession,
    shop,
    user,
  };
}

/** JWT present and the user/shop still exist. Otherwise expire the cookie via redirect. */
export async function getLiveSession(): Promise<LiveSession | null> {
  const session = await getSession();
  if (!session) return null;
  const live = await loadLiveUser(session);
  if (!live) {
    redirect(EXPIRE_PATH);
  }
  return live.session;
}

/** Same live check as getLiveSession, but returns null instead of redirecting (API routes). */
export async function getApiSession(): Promise<LiveSession | null> {
  const session = await getSession();
  if (!session) return null;
  const live = await loadLiveUser(session);
  return live?.session ?? null;
}

export async function requireSession(): Promise<LiveSession> {
  const session = await getLiveSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireShop() {
  const session = await requireSession();
  const shop = await prisma.shop.findUnique({ where: { id: session.shopId } });
  if (!shop) {
    redirect(EXPIRE_PATH);
  }
  return { session, shop };
}

export function isAdminRole(role: string) {
  return role === "owner" || role === "admin";
}

export async function requireAdmin() {
  const { session, shop } = await requireShop();
  if (!isAdminRole(session.role)) {
    redirect("/dashboard");
  }
  return { session, shop };
}
