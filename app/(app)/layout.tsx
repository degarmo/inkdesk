import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireShop } from "@/lib/auth";
import { isOnboardingEscapePath, needsOnboarding } from "@/lib/onboarding";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session, shop } = await requireShop();
  const path = (await headers()).get("x-inkdesk-path") ?? "";
  if (needsOnboarding(session.role, shop) && !isOnboardingEscapePath(path)) {
    redirect("/onboarding");
  }

  return (
    <AppShell shopName={shop.name} userName={session.name} role={session.role}>
      {children}
    </AppShell>
  );
}
