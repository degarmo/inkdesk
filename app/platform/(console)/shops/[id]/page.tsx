import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { windowStart } from "@/lib/platform-metrics";
import { prisma } from "@/lib/prisma";
import { formatShopDate, formatShopDateTime } from "@/lib/dates";
import { formatMoney, paymentStatusLabel, roleLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { shopHasOwnStripeKeys } from "@/lib/stripe";

export const metadata: Metadata = { title: "Shop" };

export default async function PlatformShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      users: { orderBy: [{ active: "desc" }, { createdAt: "asc" }] },
      appointments: {
        include: { client: true, artist: true },
        orderBy: { startAt: "desc" },
        take: 12,
      },
      payments: { orderBy: { createdAt: "desc" }, take: 8 },
      _count: { select: { clients: true, artists: true, appointments: true, payments: true } },
    },
  });
  if (!shop) notFound();

  const d30 = windowStart(30);
  const succeeded30 = await prisma.payment.aggregate({
    where: { shopId: shop.id, status: "succeeded", createdAt: { gte: d30 } },
    _count: { _all: true },
    _sum: { amountCents: true },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={shop.name}
        description={`${shop.timezone.replace(/_/g, " ")} · hours ${shop.hoursOpen}–${shop.hoursClose}. Read-only. Impersonation is not in this release.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/platform/shops">All shops</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clients" value={String(shop._count.clients)} />
        <Stat label="Artists" value={String(shop._count.artists)} />
        <Stat label="Bookings" value={String(shop._count.appointments)} />
        <Stat
          label="Stripe"
          value={shopHasOwnStripeKeys(shop) ? "Keys on file" : "Not connected"}
          hint="Secret material is not shown here."
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Settings snapshot</CardTitle>
            <CardDescription>Created {formatShopDate(shop.createdAt, shop.timezone, "MMM d, yyyy")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted">
          <p>
            <span className="text-ink">Name:</span> {shop.name}
          </p>
          <p>
            <span className="text-ink">Timezone:</span> {shop.timezone}
          </p>
          <p>
            <span className="text-ink">Hours:</span> {shop.hoursOpen} – {shop.hoursClose}
          </p>
          <p>
            <span className="text-ink">Succeeded payments (30d):</span>{" "}
            {formatMoney(succeeded30._sum.amountCents ?? 0)} · {succeeded30._count._all} rows
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {shop.users.map((user) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{user.name}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                    <p className="text-xs text-muted">
                      Last sign-in{" "}
                      {user.lastSeenAt ? formatShopDateTime(user.lastSeenAt, shop.timezone) : "never recorded"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{roleLabel(user.role)}</Badge>
                    <Badge tone={user.active ? "olive" : "muted"}>{user.active ? "Active" : "Off"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            {shop.payments.length === 0 ? (
              <p className="text-sm text-muted">No Checkout rows for this parlor.</p>
            ) : (
              <ul className="divide-y divide-line">
                {shop.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between py-3 text-sm">
                    <span className="text-ink">
                      {formatMoney(payment.amountCents)} · {payment.type}
                    </span>
                    <span className="text-muted">{paymentStatusLabel(payment.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {shop.appointments.length === 0 ? (
            <p className="text-sm text-muted">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {shop.appointments.map((appointment) => (
                <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{appointment.client.name}</p>
                    <p className="text-sm text-muted">
                      {formatShopDateTime(appointment.startAt, shop.timezone)} · {appointment.artist.name}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-serif text-2xl text-ink">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
