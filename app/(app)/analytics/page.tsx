import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CreditCard, Percent, Users } from "lucide-react";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shopAnalytics } from "@/lib/shop-metrics";
import { formatMoney, serviceLabel } from "@/lib/utils";
import {
  USAGE_FEE_OWNER_INTRO,
  artistEarningsIntro,
  formatUsageFeePercent,
  usageFeePercentNumber,
} from "@/lib/usage-fee";
import { pickArtistForUser } from "@/lib/artist-for-user";
import { loadEarningsPeriods } from "@/lib/earnings";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { MetricCard, RatioBar } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";
import { StaffEarningsEmpty, UsageFeeMoneySection } from "@/components/usage-fee-money";

export const metadata: Metadata = { title: "Analytics" };

function rateLabel(part: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

export default async function AnalyticsPage() {
  const { shop, session } = await requireShop();
  const isStaff = session.role === "staff";
  const usageFeePercent = usageFeePercentNumber(shop.usageFeePercent);
  const [stats, roster] = await Promise.all([
    shopAnalytics(shop.id),
    isStaff
      ? prisma.artist.findMany({
          where: { shopId: shop.id },
          select: { id: true, name: true, userId: true },
        })
      : Promise.resolve([]),
  ]);
  const linkedArtist = isStaff ? pickArtistForUser(roster, session) : null;
  const earnings =
    isStaff && !linkedArtist
      ? null
      : await loadEarningsPeriods({
          shopId: shop.id,
          artistId: linkedArtist?.id,
          timeZone: shop.timezone,
          usageFeePercent,
        });
  const artistRows = isStaff
    ? stats.artistRows.filter((row) => row.id === linkedArtist?.id)
    : stats.artistRows;
  const serviceMax = Math.max(1, ...stats.topServices.map((row) => row.count));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Analytics"
        description={
          isStaff
            ? `${shop.name} only. Money below is your gross, the parlor usage fee taken from it, and your net. That fee is for space and products — not Inkdesk billing.`
            : `${shop.name} only. Numbers never include another parlor. Client payments are the gross. The parlor usage fee comes out of artist earnings for space and products — not Inkdesk billing. Estimated is the deposit book on that artist’s appointments, with the same split.`
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        }
      />

      {isStaff && !linkedArtist ? <StaffEarningsEmpty percent={usageFeePercent} /> : null}
      {earnings ? (
        <UsageFeeMoneySection
          title={isStaff ? "Your earnings" : "Parlor money"}
          intro={
            isStaff && linkedArtist
              ? artistEarningsIntro(linkedArtist.name, usageFeePercent)
              : USAGE_FEE_OWNER_INTRO
          }
          percent={usageFeePercent}
          periods={earnings}
          columns={
            isStaff
              ? { gross: "Your gross", fee: "Usage fee taken", net: "Net to you" }
              : { gross: "Client payments", fee: "Usage fees from artists", net: "Net to artists" }
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Per artist</CardTitle>
            <CardDescription>
              Gross = succeeded payments on that artist’s appointments. Usage fee is taken out of that gross for parlor
              space and products ({formatUsageFeePercent(usageFeePercent)}) — not Inkdesk billing. Net is what remains
              for the artist. Estimated = deposit amounts on those bookings (same split; not remaining balance).
              {isStaff ? " Staff see only their own row." : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {artistRows.length === 0 ? (
            <EmptyState
              title={isStaff ? "No earnings row" : "No artists"}
              body={
                isStaff
                  ? "This login is not tied to a roster artist yet."
                  : "Add an artist on the roster to attribute chairs."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">Artist</th>
                    <th className="py-2 pr-3 font-medium">Bookings</th>
                    <th className="py-2 pr-3 font-medium">Completed</th>
                    <th className="py-2 pr-3 font-medium">Estimated</th>
                    <th className="py-2 pr-3 font-medium">Gross</th>
                    <th className="py-2 pr-3 font-medium">Usage fee taken</th>
                    <th className="py-2 font-medium">Net to artist</th>
                  </tr>
                </thead>
                <tbody>
                  {artistRows.map((row) => (
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
                      <td className="py-3 pr-3">{formatMoney(row.collectedCents)}</td>
                      <td className="py-3 pr-3">{formatMoney(row.shopTakeCents)}</td>
                      <td className="py-3">{formatMoney(row.artistShareCents)}</td>
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
  );
}
