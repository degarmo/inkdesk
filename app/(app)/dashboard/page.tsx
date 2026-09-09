import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CreditCard, Percent, Wallet } from "lucide-react";
import { requireShop, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayBounds, formatShopDate, formatShopTime, shopTodayKey } from "@/lib/dates";
import { formatMoney, formatPhone, parseTags, serviceLabel, tagLabel } from "@/lib/utils";
import { shopAnalytics } from "@/lib/shop-metrics";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";
import { AppointmentPayActions } from "@/components/appointment-pay-actions";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";
import { appointmentHasPrep, prepReadyIds } from "@/lib/images";
import { buildSetupChecklist } from "@/lib/onboarding";
import { shopHasOwnStripeKeys, stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { shop, session } = await requireShop();
  const { setup } = await searchParams;
  const todayKey = shopTodayKey(shop.timezone);
  const { start, end } = dayBounds(todayKey, shop.timezone);

  const [todays, unpaid, recentClients, stats, artistCount, extraUserCount, clientCount, appointmentCount] =
    await Promise.all([
    prisma.appointment.findMany({
      where: { shopId: shop.id, startAt: { gte: start, lte: end } },
      include: { client: true, artist: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        shopId: shop.id,
        depositPaid: false,
        depositCents: { gt: 0 },
        status: { in: ["scheduled", "completed"] },
      },
      include: { client: true, artist: true },
      orderBy: { startAt: "asc" },
      take: 8,
    }),
    prisma.client.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    shopAnalytics(shop.id),
    prisma.artist.count({ where: { shopId: shop.id } }),
    prisma.user.count({ where: { shopId: shop.id, role: { not: "owner" } } }),
    prisma.client.count({ where: { shopId: shop.id } }),
    prisma.appointment.count({ where: { shopId: shop.id } }),
  ]);

  const checklist = buildSetupChecklist({
    artistCount,
    extraUserCount,
    hasStripeKeys: shopHasOwnStripeKeys(shop),
    clientCount,
    appointmentCount,
  });
  const leftoverCore = checklist.some(
    (item) => !item.done && (item.id === "artist" || item.id === "team" || item.id === "client"),
  );
  const leftoverStripe = checklist.some((item) => item.id === "stripe" && !item.done);
  const showChecklist =
    isAdminRole(session.role) &&
    (setup === "1" || leftoverCore || (leftoverStripe && appointmentCount === 0));

  const prep = await prepReadyIds(
    shop.id,
    todays.map((appointment) => appointment.id),
    todays.map((appointment) => appointment.clientId),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Today on the floor"
        description={`${shop.name} · ${formatShopDate(new Date(), shop.timezone, "EEEE, MMMM d")}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/analytics">Analytics</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/clients/new">New client</Link>
            </Button>
            <Button asChild>
              <Link href="/appointments/new">Book appointment</Link>
            </Button>
          </>
        }
      />

      {showChecklist ? (
        <SetupChecklist
          items={checklist}
          title={setup === "1" ? "Setup saved — leftovers" : "Setup remaining"}
          description="Owner and admin can re-open the full guide from Settings. Staff do not see this card."
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Wallet}
          label="Revenue (30d)"
          value={formatMoney(stats.revenue30Cents)}
          hint={`${formatMoney(stats.revenueAllCents)} all time · ${formatMoney(stats.revenue7Cents)} last 7 days`}
        />
        <MetricCard
          icon={CreditCard}
          label="Unpaid deposits"
          value={formatMoney(stats.unpaidDepositCents)}
          hint={`${stats.unpaidDepositCount} open`}
        />
        <MetricCard
          icon={Percent}
          label="Deposit collection"
          value={stats.depositRate === null ? "—" : `${Math.round(stats.depositRate * 100)}%`}
          hint={`${stats.paidDeposits} of ${stats.depositBooked} deposits marked paid`}
        />
        <MetricCard
          icon={CalendarClock}
          label="Upcoming week"
          value={String(stats.upcomingWeek)}
          hint="Scheduled in the next 7 days"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s appointments</CardTitle>
            <Badge>{todays.length}</Badge>
          </CardHeader>
          <CardContent>
            {todays.length === 0 ? (
              <EmptyState
                title="Nothing on the books yet"
                body="Walk-ins and leftover consults can be added as they land."
                action={
                  <Button asChild size="sm">
                    <Link href="/appointments/new">Add a booking</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {todays.map((appointment) => (
                  <li key={appointment.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {formatShopTime(appointment.startAt, shop.timezone)} · {appointment.client.name}
                      </p>
                      <p className="text-sm text-muted">
                        {appointment.artist.name} · {serviceLabel(appointment.serviceType)} · {appointment.durationMin} min
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {appointmentHasPrep(appointment.id, appointment.clientId, prep) ? (
                        <Badge tone="olive">Prep ready</Badge>
                      ) : null}
                      <StatusBadge status={appointment.status} />
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/appointments/${appointment.id}`}>Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shop hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif text-ink">
              {shop.hoursOpen} – {shop.hoursClose}
            </p>
            <p className="mt-2 text-sm text-muted">{shop.timezone.replace(/_/g, " ")}</p>
            <Button asChild variant="ghost" className="mt-4 px-0">
              <Link href="/settings">Edit settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Unpaid deposits</CardTitle>
          </CardHeader>
          <CardContent>
            {unpaid.length === 0 ? (
              <p className="text-sm text-muted">No open deposits. Nice and quiet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {unpaid.map((appointment) => (
                  <li key={appointment.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {appointment.client.name} · {formatMoney(appointment.depositCents)}
                      </p>
                      <p className="text-sm text-muted">
                        {formatShopDate(appointment.startAt, shop.timezone)} · {appointment.artist.name}
                      </p>
                    </div>
                    <AppointmentPayActions
                      appointmentId={appointment.id}
                      depositCents={appointment.depositCents}
                      depositPaid={appointment.depositPaid}
                      stripeReady={stripeConfigured(shop)}
                      isAdmin={isAdminRole(session.role)}
                      compact
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent clients</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/clients">All clients</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted">Add your first client to start the book.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentClients.map((client) => (
                  <li key={client.id} className="py-3">
                    <Link href={`/clients/${client.id}`} className="block">
                      <p className="text-sm font-medium text-ink">{client.name}</p>
                      <p className="text-sm text-muted">
                        {client.phone ? formatPhone(client.phone) : "No phone"}
                        {parseTags(client.tags).length > 0
                          ? ` · ${parseTags(client.tags).map(tagLabel).join(", ")}`
                          : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
