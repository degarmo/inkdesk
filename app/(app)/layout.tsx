import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireShop } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session, shop } = await requireShop();

  return (
    <AppShell shopName={shop.name} userName={session.name} role={session.role}>
      {children}
    </AppShell>
  );
}
