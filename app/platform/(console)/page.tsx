import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  CreditCard,
  Eye,
  Store,
  TrendingUp,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { platformMetrics, windowStart } from "@/lib/platform-metrics";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { formatShopDate } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { MetricCard, RatioBar } from "@/components/metric-card";
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
  const pathMax = Math.max(1, ...metrics.topPaths.map((row) => row.count));

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Platform overview"
        description="Every parlor on this Inkdesk instance. This is not shop Admin — operators do not sit a chair."
      />

      <section className="grid gap-3">
        <h2 className="font-serif text-xl text-ink">SaaS health</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            icon={Store}
            label="Total shops"
            value={String(metrics.shopCount)}
            hint="Parlors with a shop record on this instance"
          />
          <MetricCard
            icon={Activity}
            label="Active shops"
            value={String(metrics.activeShops)}
            hint={`Login or booking start since ${formatShopDate(windowStart(30), "UTC", "MMM d")}`}
          />
          <MetricCard
            icon={UserPlus}
            label="Shop signups"
            value={String(metrics.shops7)}
            hint={`${metrics.shops30} created in the last 30 days`}
          />
          <MetricCard
            icon={TrendingUp}
            label="Conversion"
            value={metrics.conversionRate === null ? "—" : `${Math.round(metrics.conversionRate * 100)}%`}
            hint={`${metrics.shopsWithBookings} of ${metrics.shopCount} shops have at least one booking`}
          />
          <MetricCard
            icon={UserMinus}
            label="Churn proxy"
            value={String(metrics.churnNoLogin30)}
            hint="Shops with no parlor login in 30 days"
          />
          <MetricCard
            icon={Users}
            label="Shop users"
            value={String(metrics.userTotal)}
            hint={`${metrics.roleCounts.owner} owner · ${metrics.roleCounts.admin} admin · ${metrics.roleCounts.staff} staff`}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-xl text-ink">Bookings and GMV</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            label="GMV (all time)"
            value={formatMoney(metrics.gmvAllCents)}
            hint={`${metrics.gmvAllCount} succeeded Checkout rows`}
          />
          <MetricCard
            icon={CreditCard}
            label="Succeeded (30d)"
            value={formatMoney(metrics.payments30Cents)}
            hint={`${metrics.payments30Count} succeeded in the last 30 days`}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-xl text-ink">Traffic</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Eye}
            label="Visits (7d)"
            value={String(metrics.views7)}
            hint={`${metrics.sessions7} rough sessions (visitor cookie)`}
          />
          <MetricCard
            icon={Eye}
            label="Visits (30d)"
            value={String(metrics.views30)}
            hint={`${metrics.sessions30} rough sessions`}
          />
        </div>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top paths (30 days)</CardTitle>
              <CardDescription>
                First-party page views from the layout beacon (`POST /api/visits`). Not Google Analytics. Bots are not
                filtered. Unique sessions are `inkdesk_vid` cookies, not people.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {metrics.topPaths.length === 0 ? (
              <p className="text-sm text-muted">No visits recorded yet. Seed inserts demo rows; browsing adds more.</p>
            ) : (
              metrics.topPaths.map((row) => (
                <RatioBar key={row.path} label={row.path} value={row.count} max={pathMax} right={String(row.count)} />
              ))
            )}
          </CardContent>
        </Card>
      </section>

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
              <CardTitle>How these numbers are counted</CardTitle>
              <CardDescription>Read this so the dashboard is not a mystery.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted">
            <p>
              A shop is <span className="text-ink">active</span> if a parlor user signed in during the last 30 days, or
              it has a booking whose start already fell in that window. Upcoming-only books do not count.
            </p>
            <p>
              <span className="text-ink">Churn proxy</span> is shops with no parlor login (`lastSeenAt`) in 30 days —
              not cancellations. Conversion is shops that have recorded at least one appointment.
            </p>
            <p>
              GMV is succeeded Checkout rows across every parlor. Pending or failed rows are on the Payments pulse.
            </p>
            <p>Impersonating a parlor login is not in this release. Open a shop detail for a read-only snapshot.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
