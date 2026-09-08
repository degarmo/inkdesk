import type { Metadata } from "next";
import Link from "next/link";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDayKey, dayBounds, formatShopDate, formatShopTime, shopTodayKey, zonedDateTime } from "@/lib/dates";
import { formatMoney, serviceLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, NativeSelect } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Appointments" };

function weekAround(dayKey: string) {
  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => addDayKey(dayKey, offset));
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; artistId?: string; status?: string }>;
}) {
  const { shop } = await requireShop();
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

  const days = weekAround(day);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Appointments"
        description="A week strip and the day's chair time. Open a booking to edit or add notes."
        actions={
          <Button asChild>
            <Link href="/appointments/new">New appointment</Link>
          </Button>
        }
      />

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Button asChild size="sm" variant="outline">
            <Link href={`/appointments?day=${addDayKey(day, -7)}`}>Previous week</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/appointments">Today</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/appointments?day=${addDayKey(day, 7)}`}>Next week</Link>
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((key) => {
            const labelDate = zonedDateTime(key, "12:00", shop.timezone);
            const active = key === day;
            const isToday = key === todayKey;
            return (
              <Link
                key={key}
                href={`/appointments?day=${key}${params.artistId ? `&artistId=${params.artistId}` : ""}${params.status ? `&status=${params.status}` : ""}`}
                className={cn(
                  "rounded-lg border px-1 py-2 text-center sm:px-2",
                  active ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:bg-paper",
                )}
              >
                <p className="text-[10px] uppercase tracking-wide sm:text-xs">
                  {formatShopDate(labelDate, shop.timezone, "EEE")}
                </p>
                <p className="font-serif text-lg leading-none sm:text-xl">
                  {formatShopDate(labelDate, shop.timezone, "d")}
                </p>
                {isToday && !active ? <p className="mt-1 text-[10px] text-oxblood">Today</p> : null}
              </Link>
            );
          })}
        </div>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" action="/appointments">
        <input type="hidden" name="day" value={day} />
        <NativeSelect name="artistId" defaultValue={params.artistId ?? ""} className="sm:max-w-xs">
          <option value="">All artists</option>
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={params.status ?? ""} className="sm:max-w-xs">
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no-show">No-show</option>
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {appointments.length === 0 ? (
        <EmptyState
          title="No appointments this day"
          body="Book a consult, session, or touch-up, or flip to another day on the strip."
          action={
            <Button asChild>
              <Link href="/appointments/new">Book appointment</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <ul className="divide-y divide-line">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <Link
                  href={`/appointments/${appointment.id}`}
                  className="flex flex-col gap-3 px-4 py-4 hover:bg-paper/70 sm:flex-row sm:items-center sm:justify-between"
                >
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
                        {appointment.depositPaid ? "Deposit paid" : `${formatMoney(appointment.depositCents)} due`}
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
