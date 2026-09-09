import { isAdminRole } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

/** After signup / login / landing while a parlor session exists. */
export async function parlorEntryPath(session: { role: string; shopId: string }) {
  if (!isAdminRole(session.role)) return "/dashboard";
  const shop = await prisma.shop.findUnique({
    where: { id: session.shopId },
    select: { onboardingCompletedAt: true },
  });
  if (shop && !shop.onboardingCompletedAt) return "/onboarding";
  return "/dashboard";
}
