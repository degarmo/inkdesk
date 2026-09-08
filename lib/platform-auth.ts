import { redirect } from "next/navigation";
import { getPlatformSession, type PlatformSession } from "./platform-session";
import { prisma } from "./prisma";

const EXPIRE_PATH = "/platform/session/expire";

export type LivePlatform = PlatformSession & { active: boolean };

async function loadLive(session: PlatformSession) {
  const user = await prisma.platformUser.findUnique({ where: { id: session.id } });
  if (!user || !user.active || user.email !== session.email) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    active: user.active,
  } satisfies LivePlatform;
}

export async function getLivePlatform(): Promise<LivePlatform | null> {
  const session = await getPlatformSession();
  if (!session) return null;
  const live = await loadLive(session);
  if (!live) {
    redirect(EXPIRE_PATH);
  }
  return live;
}

export async function requirePlatformAdmin(): Promise<LivePlatform> {
  const session = await getLivePlatform();
  if (!session) {
    redirect("/platform/login");
  }
  return session;
}
