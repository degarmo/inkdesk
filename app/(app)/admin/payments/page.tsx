import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatShopDateTime } from "@/lib/dates";
import { formatMoney, paymentStatusLabel, paymentTypeLabel } from "@/lib/utils";
import { formatUsageFeePercent, splitGrossCents, usageFeePercentNumber } from "@/lib/usage-fee";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";
import { stripeConfigured } from "@/lib/stripe";
import { STRIPE_NOT_CONFIGURED } from "@/lib/constants";

export const metadata: Metadata = { title: "Payments" };

function toneForStatus(status: string) {
  if (status === "succeeded") return "olive" as const;
  if (status === "failed") return "rust" as const;
  if (status === "canceled") return "muted" as const;
  return "gold" as const;
}

export default async function AdminPaymentsPage() {
  const { shop } = await requireAdmin();
  const stripeReady = stripeConfigured(shop);
  const usageFeePercent = usageFeePercentNumber(shop.usageFeePercent);
  const payments = await prisma.payment.findMany({
    where: { shopId: shop.id },
    include: {
      client: true,
      appointment: { include: { artist: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payments"
        description="Checkout history for this parlor. Each charge used this shop’s Stripe secret key. Shop usage fee is this parlor’s cut of artist usage — not Inkdesk billing."
      />

      {!stripeReady ? (
        <EmptyState
          title={STRIPE_NOT_CONFIGURED}
          body="Save this parlor’s publishable key, secret key, and webhook signing secret. There is no shared Inkdesk Stripe account."
          action={
            <Button asChild>
              <Link href="/admin/settings">Parlor settings</Link>
            </Button>
          }
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            {payments.length === 0 ? "No checkouts yet." : `${payments.length} most recent rows · parlor usage fee ${formatUsageFeePercent(usageFeePercent)}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted">
              When someone pays a deposit or balance, the webhook marks the row succeeded and sets deposit paid
              on that booking.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {payments.map((payment) => {
                const split =
                  payment.status === "succeeded"
                    ? splitGrossCents(payment.amountCents, usageFeePercent)
                    : null;
                return (
                <li key={payment.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {formatMoney(payment.amountCents)} · {paymentTypeLabel(payment.type)}
                      {payment.client ? ` · ${payment.client.name}` : ""}
                    </p>
                    <p className="text-sm text-muted">
                      {formatShopDateTime(payment.createdAt, shop.timezone)}
                      {payment.appointment?.artist ? ` · ${payment.appointment.artist.name}` : ""}
                    </p>
                    {split ? (
                      <p className="text-sm text-muted">
                        Shop usage fee {formatMoney(split.shopTakeCents)} · artist share{" "}
                        {formatMoney(split.artistShareCents)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={toneForStatus(payment.status)}>{paymentStatusLabel(payment.status)}</Badge>
                    {payment.appointmentId ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/appointments/${payment.appointmentId}`}>Booking</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
