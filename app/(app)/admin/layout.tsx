import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Admin</p>
          <p className="text-sm text-muted">
            Owners and admins only. Staff stay on the shop floor.{" "}
            <Link href="/dashboard" className="text-ink underline-offset-2 hover:underline">
              Back to the floor
            </Link>
          </p>
        </div>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
