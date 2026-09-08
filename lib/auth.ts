import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";
import { prisma } from "./prisma";

const EXPIRE_PATH = "/session/expire";

async function sessionStillLive(session: SessionUser) {
  const [user, shop] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { id: true } }),
    prisma.shop.findUnique({ where: { id: session.shopId }, select: { id: true } }),
  ]);
  return Boolean(user && shop);
}

/** JWT present and the user/shop still exist. Otherwise expire the cookie via redirect. */
export async function getLiveSession(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  if (await sessionStillLive(session)) return session;
  redirect(EXPIRE_PATH);
}

/** Same live check as getLiveSession, but returns null instead of redirecting (API routes). */
export async function getApiSession(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  if (!(await sessionStillLive(session))) return null;
  return session;
}

export async function requireSession(): Promise<SessionUser> {
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
