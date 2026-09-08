import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";
import { prisma } from "./prisma";

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireShop() {
  const session = await requireSession();
  const shop = await prisma.shop.findUnique({ where: { id: session.shopId } });
  if (!shop) {
    redirect("/login");
  }
  return { session, shop };
}
