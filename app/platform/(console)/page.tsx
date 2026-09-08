import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CreditCard, Store, UserRound, Users } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { platformMetrics, windowStart } from "@/lib/platform-metrics";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { formatShopDate } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Platform" };

export default async function PlatformOverviewPage() {
  await requirePlatformAdmin();
  const metrics = await platformMetrics();
  const recentShops = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, createdAt: true, timezone: true, _count: { select: { users: true } } },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Platform overview"
        description="Every parlor on this Inkdesk instance. This is not shop Admin — operators do not sit a chair."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={Store}
          label="Total shops"
          value={String(metrics.shopCount)}
          hint="Parlors with a shop record on this instance"
        />
        <MetricCard
          icon={Store}
          label="Active shops"
          value={String(metrics.activeShops)}
          hint={`Login or booking start since ${formatShopDate(windowStart(30), "UTC", "MMM d")}`}
        />
        <MetricCard
          icon={Users}
          label="Shop users"
          value={String(metrics.userTotal)}
          hint={`${metrics.roleCounts.owner} owner · ${metrics.roleCounts.admin} admin · ${metrics.roleCounts.staff} staff`}
        />
        <MetricCard
          icon={UserRound}
          label="Clients"
          value={String(metrics.clientCount)}
          hint="Client cards across every parlor"
        />
        <MetricCard
          icon={CalendarDays}
          label="Bookings"
          value={String(metrics.bookingTotal)}
          hint={`${metrics.booking7} last 7 days · ${metrics.booking30} last 30 days`}
        />
        <MetricCard
          icon={CreditCard}
          label="Succeeded payments"
          value={formatMoney(metrics.payments30Cents)}
          hint={`${metrics.payments30Count} succeeded in the last 30 days`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Newest shops</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/platform/shops">All shops</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentShops.length === 0 ? (
              <p className="text-sm text-muted">No parlors yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentShops.map((shop) => (
                  <li key={shop.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link href={`/platform/shops/${shop.id}`} className="text-sm font-medium text-ink hover:underline">
                        {shop.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {formatShopDate(shop.createdAt, shop.timezone, "MMM d, yyyy")} · {shop._count.users} logins
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>How activity is counted</CardTitle>
              <CardDescription>Read this so the numbers are not a mystery.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted">
            <p>
              A shop is <span className="text-ink">active</span> if a parlor user signed in during the last 30 days, or
              it has a booking whose start already fell in that window. Upcoming-only books do not count.
            </p>
            <p>
              Payments are Checkout rows with status succeeded in the last 30 days. Pending or failed rows are on the
              Payments pulse, not in the sum.
            </p>
            <p>
              Impersonating a parlor login is not in this release. Open a shop detail for a read-only snapshot.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-serif text-3xl text-ink">{value}</p>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}
