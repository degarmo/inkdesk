import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { formatShopDateTime } from "@/lib/dates";
import { formatMoney, paymentStatusLabel, paymentTypeLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";

export const metadata: Metadata = { title: "Payments pulse" };

function toneForStatus(status: string) {
  if (status === "succeeded") return "olive" as const;
  if (status === "failed") return "rust" as const;
  if (status === "canceled") return "muted" as const;
  return "gold" as const;
}

export default async function PlatformPaymentsPage() {
  await requirePlatformAdmin();
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { shop: true, client: true },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payments pulse"
        description="Checkout rows from every parlor. Amounts are what that shop charged on its own Stripe account."
      />

      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          body="When a parlor connects Stripe and someone pays a deposit, the row appears here."
        />
      ) : (
        <Card>
          <CardContent className="pt-2">
            <ul className="divide-y divide-line">
              {payments.map((payment) => (
                <li key={payment.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {formatMoney(payment.amountCents)} · {paymentTypeLabel(payment.type)}
                      {payment.client ? ` · ${payment.client.name}` : ""}
                    </p>
                    <p className="text-sm text-muted">{formatShopDateTime(payment.createdAt, payment.shop.timezone)}</p>
                    <Link
                      href={`/platform/shops/${payment.shopId}`}
                      className="text-xs text-ink underline-offset-2 hover:underline"
                    >
                      {payment.shop.name}
                    </Link>
                  </div>
                  <Badge tone={toneForStatus(payment.status)}>{paymentStatusLabel(payment.status)}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
