import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { formatShopDateTime } from "@/lib/dates";
import { serviceLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Bookings pulse" };

export default async function PlatformBookingsPage() {
  await requirePlatformAdmin();
  const appointments = await prisma.appointment.findMany({
    orderBy: { startAt: "desc" },
    take: 60,
    include: { shop: true, client: true, artist: true },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Bookings pulse"
        description="Latest appointments across every parlor. Times shown in that shop’s timezone."
      />

      {appointments.length === 0 ? (
        <EmptyState title="No bookings" body="When parlors put people on chairs, they show up here." />
      ) : (
        <Card>
          <CardContent className="pt-2">
            <ul className="divide-y divide-line">
              {appointments.map((appointment) => (
                <li key={appointment.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{appointment.client.name}</p>
                    <p className="text-sm text-muted">
                      {formatShopDateTime(appointment.startAt, appointment.shop.timezone)} · {appointment.artist.name} ·{" "}
                      {serviceLabel(appointment.serviceType)}
                    </p>
                    <Link
                      href={`/platform/shops/${appointment.shopId}`}
                      className="text-xs text-ink underline-offset-2 hover:underline"
                    >
                      {appointment.shop.name}
                    </Link>
                  </div>
                  <StatusBadge status={appointment.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
