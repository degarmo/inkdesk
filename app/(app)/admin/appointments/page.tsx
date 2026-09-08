import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDayKey, dayBounds, formatShopDate, formatShopTime, shopTodayKey } from "@/lib/dates";
import { formatMoney, serviceLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, NativeSelect } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { APPOINTMENT_STATUSES } from "@/lib/constants";

export const metadata: Metadata = { title: "Appointment oversight" };

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; artistId?: string; status?: string }>;
}) {
  const { shop } = await requireAdmin();
  const params = await searchParams;
  const todayKey = shopTodayKey(shop.timezone);
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : todayKey;
  const { start, end } = dayBounds(day, shop.timezone);

  const artists = await prisma.artist.findMany({
    where: { shopId: shop.id },
    orderBy: { name: "asc" },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      shopId: shop.id,
      startAt: { gte: start, lte: end },
      ...(params.artistId ? { artistId: params.artistId } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
    include: { client: true, artist: true },
    orderBy: { startAt: "asc" },
  });

  const query = new URLSearchParams();
  if (params.artistId) query.set("artistId", params.artistId);
  if (params.status) query.set("status", params.status);
  const extra = query.toString();
  const withDay = (key: string) => `/admin/appointments?day=${key}${extra ? `&${extra}` : ""}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Appointment oversight"
        description="Filter the book by day, artist, or status. Open a row to collect a deposit."
      />

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
        <input type="hidden" name="day" value={day} />
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Artist</span>
          <NativeSelect name="artistId" defaultValue={params.artistId ?? ""} className="w-full sm:w-52">
            <option value="">All artists</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Status</span>
          <NativeSelect name="status" defaultValue={params.status ?? ""} className="w-full sm:w-44">
            <option value="">All statuses</option>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <Button asChild size="sm" variant="outline">
          <Link href={withDay(addDayKey(day, -1))}>Previous day</Link>
        </Button>
        <p className="text-sm text-muted">{formatShopDate(start, shop.timezone, "EEEE, MMMM d")}</p>
        <Button asChild size="sm" variant="outline">
          <Link href={withDay(addDayKey(day, 1))}>Next day</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          {appointments.length === 0 ? (
            <EmptyState title="No bookings for this filter" body="Try another day, artist, or status." />
          ) : (
            <ul className="divide-y divide-line">
              {appointments.map((appointment) => (
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
                    <StatusBadge status={appointment.status} />
                    {appointment.depositCents > 0 ? (
                      <Badge tone={appointment.depositPaid ? "olive" : "gold"}>
                        {appointment.depositPaid
                          ? `${formatMoney(appointment.depositCents)} deposit paid`
                          : `${formatMoney(appointment.depositCents)} due`}
                      </Badge>
                    ) : null}
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
    </div>
  );
}
