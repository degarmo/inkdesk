import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { PlatformShell } from "@/components/platform-shell";

export default async function PlatformConsoleLayout({ children }: { children: ReactNode }) {
  const operator = await requirePlatformAdmin();
  return <PlatformShell operatorName={operator.name}>{children}</PlatformShell>;
}
