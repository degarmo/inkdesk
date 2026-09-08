"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Parlor settings" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/payments", label: "Payments" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm",
              active ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:bg-paper",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
