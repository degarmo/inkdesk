import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayBounds, formatShopDate, shopTodayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { stripeConfigured, shopStripeCredentials } from "@/lib/stripe";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  const { shop } = await requireAdmin();
  const todayKey = shopTodayKey(shop.timezone);
  const { start, end } = dayBounds(todayKey, shop.timezone);
  const stripeReady = stripeConfigured(shop);
  const stripeSource = shopStripeCredentials(shop)?.source;

  const [users, todays, unpaid, payments] = await Promise.all([
    prisma.user.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "asc" } }),
    prisma.appointment.count({ where: { shopId: shop.id, startAt: { gte: start, lte: end } } }),
    prisma.appointment.count({
      where: {
        shopId: shop.id,
        depositPaid: false,
        depositCents: { gt: 0 },
        status: { in: ["scheduled", "completed"] },
      },
    }),
    prisma.payment.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const activeUsers = users.filter((user) => user.active).length;
  const succeeded = payments.filter((payment) => payment.status === "succeeded");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Parlor admin"
        description={`${shop.name} · ${formatShopDate(new Date(), shop.timezone, "EEEE, MMMM d")}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl text-ink">{activeUsers}</p>
            <p className="mt-1 text-sm text-muted">{users.length} accounts on this shop</p>
            <Button asChild variant="ghost" className="mt-3 px-0">
              <Link href="/admin/users">Manage users</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl text-ink">{todays}</p>
            <p className="mt-1 text-sm text-muted">Bookings on the floor</p>
            <Button asChild variant="ghost" className="mt-3 px-0">
              <Link href="/admin/appointments">Appointment oversight</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl text-ink">{unpaid}</p>
            <p className="mt-1 text-sm text-muted">Still waiting on a card or cash</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stripe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-3xl text-ink">{stripeReady ? "Ready" : "Off"}</p>
            <p className="mt-1 text-sm text-muted">
              {stripeReady
                ? stripeSource === "env"
                  ? "Using local .env fallback until you save parlor keys"
                  : "This parlor’s Stripe account"
                : "Save keys under Parlor settings"}
            </p>
            <Button asChild variant="ghost" className="mt-3 px-0">
              <Link href="/admin/settings">Parlor settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent payments</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/payments">All payments</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted">
              No Stripe checkouts yet. Connect this parlor&apos;s account, then use Pay deposit on a booking.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-ink">
                    {formatMoney(payment.amountCents)} · {payment.type} · {payment.status}
                  </span>
                  <span className="text-muted">{formatShopDate(payment.createdAt, shop.timezone, "MMM d")}</span>
                </li>
              ))}
            </ul>
          )}
          {succeeded.length > 0 ? (
            <p className="mt-3 text-xs text-muted">Showing the five most recent rows, including pending checkouts.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>Owner and admin share this section. Staff cannot open /admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1 text-sm text-muted">
            <li>
              <span className="text-ink">Owner</span> — full parlor control, including users and Stripe keys.
            </li>
            <li>
              <span className="text-ink">Admin</span> — same Admin tools; cannot deactivate the last owner.
            </li>
            <li>
              <span className="text-ink">Staff</span> — clients, appointments, notes, and images. Own chair
              earnings only (day / week / month / year). No shop GMV, no Settings, no adding artists, no /admin.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
