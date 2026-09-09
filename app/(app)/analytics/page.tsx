import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CreditCard, Percent, Users } from "lucide-react";
import { requireShop } from "@/lib/auth";
import { shopAnalytics } from "@/lib/shop-metrics";
import { formatMoney, serviceLabel } from "@/lib/utils";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { MetricCard, RatioBar } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";

export const metadata: Metadata = { title: "Analytics" };

function rateLabel(part: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

export default async function AnalyticsPage() {
  const { shop } = await requireShop();
  const stats = await shopAnalytics(shop.id);
  const serviceMax = Math.max(1, ...stats.topServices.map((row) => row.count));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Analytics"
        description={`${shop.name} only. Numbers never include another parlor. Full session price is not a field — estimated artist revenue is the deposit book on that artist’s appointments; collected is succeeded Checkout on those rows.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={CreditCard}
          label="Revenue"
          value={formatMoney(stats.revenueAllCents)}
          hint={`${stats.revenueAllCount} succeeded all time · ${formatMoney(stats.revenue7Cents)} last 7d · ${formatMoney(stats.revenue30Cents)} last 30d`}
        />
        <MetricCard
          icon={CreditCard}
          label="Unpaid deposits"
          value={formatMoney(stats.unpaidDepositCents)}
          hint={`${stats.unpaidDepositCount} open on scheduled or completed chairs`}
        />
        <MetricCard
          icon={Percent}
          label="Deposit collection"
          value={stats.depositRate === null ? "—" : `${Math.round(stats.depositRate * 100)}%`}
          hint={
            stats.depositBooked === 0
              ? "No deposits on the books"
              : `${stats.paidDeposits} of ${stats.depositBooked} bookings with a deposit marked paid`
          }
        />
        <MetricCard
          icon={CalendarDays}
          label="Upcoming week"
          value={String(stats.upcomingWeek)}
          hint="Scheduled starts in the next 7 days"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Clients"
          value={String(stats.clientTotal)}
          hint={`${stats.clients7} new last 7 days · ${stats.clients30} last 30 days`}
        />
        <MetricCard
          icon={CalendarDays}
          label="Bookings"
          value={String(stats.bookingTotal)}
          hint={APPOINTMENT_STATUSES.map((item) => `${stats.statusCounts[item.value] ?? 0} ${item.label.toLowerCase()}`).join(" · ")}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Booking mix</CardTitle>
            <CardDescription>Share of this parlor’s appointments by status.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {APPOINTMENT_STATUSES.map((item) => {
            const count = stats.statusCounts[item.value] ?? 0;
            return (
              <div key={item.value} className="rounded-lg border border-line px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-1 font-serif text-2xl text-ink">{count}</p>
                <p className="text-sm text-muted">{rateLabel(count, stats.bookingTotal)}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Per artist</CardTitle>
              <CardDescription>
                Collected = succeeded payments on that artist’s appointments. Estimated = deposit amounts on those
                bookings (not remaining balance).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {stats.artistRows.length === 0 ? (
              <EmptyState title="No artists" body="Add an artist on the roster to attribute chairs." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3 font-medium">Artist</th>
                      <th className="py-2 pr-3 font-medium">Bookings</th>
                      <th className="py-2 pr-3 font-medium">Completed</th>
                      <th className="py-2 pr-3 font-medium">Estimated</th>
                      <th className="py-2 font-medium">Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.artistRows.map((row) => (
                      <tr key={row.id} className="border-b border-line last:border-0">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-ink">{row.name}</p>
                          <p className="text-xs text-muted">
                            {row.specialty || "No specialty"}
                            {row.active ? "" : " · inactive"}
                          </p>
                        </td>
                        <td className="py-3 pr-3">{row.bookings}</td>
                        <td className="py-3 pr-3">{row.completed}</td>
                        <td className="py-3 pr-3">{formatMoney(row.estimatedCents)}</td>
                        <td className="py-3">{formatMoney(row.collectedCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top services</CardTitle>
              <CardDescription>Consult, tattoo session, and touch-up counts on this parlor.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {stats.topServices.length === 0 ? (
              <p className="text-sm text-muted">No bookings yet.</p>
            ) : (
              stats.topServices.map((row) => (
                <RatioBar
                  key={row.value}
                  label={serviceLabel(row.value)}
                  value={row.count}
                  max={serviceMax}
                  right={`${row.count}`}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
