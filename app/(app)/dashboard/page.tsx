import type { Metadata } from "next";
import Link from "next/link";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayBounds, formatShopDate, formatShopTime, shopTodayKey } from "@/lib/dates";
import { formatMoney, formatPhone, parseTags, serviceLabel, tagLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";
import { DepositButton } from "@/components/deposit-button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { shop } = await requireShop();
  const todayKey = shopTodayKey(shop.timezone);
  const { start, end } = dayBounds(todayKey, shop.timezone);

  const [todays, unpaid, recentClients] = await Promise.all([
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
  ]);

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Today on the floor"
        description={`${shop.name} · ${formatShopDate(new Date(), shop.timezone, "EEEE, MMMM d")}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/clients/new">New client</Link>
            </Button>
            <Button asChild>
              <Link href="/appointments/new">Book appointment</Link>
            </Button>
          </>
        }
      />

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
                    <div className="flex items-center gap-2">
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
                    <DepositButton appointmentId={appointment.id} />
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
