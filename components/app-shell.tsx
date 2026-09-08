"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CalendarDays, LayoutDashboard, Menu, Settings, Shield, Users, X, PenTool } from "lucide-react";
import { logOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn, isAdminRole } from "@/lib/utils";

const floorLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/artists", label: "Artists", icon: PenTool },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  shopName,
  userName,
  role,
  children,
}: {
  shopName: string;
  userName: string;
  role: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const showAdmin = isAdminRole(role);

  const links = showAdmin
    ? [...floorLinks, { href: "/admin", label: "Admin", icon: Shield }]
    : floorLinks;

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin" || pathname.startsWith("/admin/")
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
        <Link href="/dashboard" className="px-2">
          <p className="font-serif text-2xl tracking-tight text-ink">Inkdesk</p>
          <p className="mt-1 text-xs text-muted">{shopName}</p>
        </Link>
        <div className="mt-8 flex-1">{nav}</div>
        <div className="border-t border-line pt-4">
          <p className="px-2 text-sm text-ink">{userName}</p>
          <p className="px-2 text-xs capitalize text-muted">{role}</p>
          <form action={logOut} className="mt-2">
            <Button type="submit" variant="ghost" className="w-full justify-start px-2 text-muted">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/dashboard">
          <p className="font-serif text-xl text-ink">Inkdesk</p>
          <p className="text-xs text-muted">{shopName}</p>
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
            <form action={logOut} className="mt-auto">
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
