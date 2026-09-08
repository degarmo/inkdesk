"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Building2, CalendarDays, CreditCard, LayoutDashboard, LogOut, Menu, Store, X } from "lucide-react";
import { platformLogOut } from "@/actions/platform-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/platform", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/platform/shops", label: "Shops", icon: Store },
  { href: "/platform/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/platform/payments", label: "Payments", icon: CreditCard },
];

export function PlatformShell({
  operatorName,
  children,
}: {
  operatorName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-ink text-paper" : "text-ink/80 hover:bg-paper",
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
        <Link href="/platform" className="px-2">
          <p className="font-serif text-2xl tracking-tight text-ink">Inkdesk</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <Building2 className="h-3 w-3" />
            Platform
          </p>
        </Link>
        <div className="mt-8 flex-1">{nav}</div>
        <div className="border-t border-line pt-4">
          <p className="px-2 text-sm text-ink">{operatorName}</p>
          <p className="px-2 text-xs text-muted">Operator</p>
          <form action={platformLogOut} className="mt-2">
            <Button type="submit" variant="ghost" className="w-full justify-start px-2 text-muted">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/platform">
          <p className="font-serif text-xl text-ink">Inkdesk Platform</p>
        </Link>
        <Button variant="outline" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 bg-ink/20 md:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-72 flex-col bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {nav}
            <form action={platformLogOut} className="mt-auto">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
