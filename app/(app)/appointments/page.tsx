import type { Metadata } from "next";
import Link from "next/link";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayBounds, formatShopDate, groupByShopDay, shopTodayKey, zonedDateTime } from "@/lib/dates";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, NativeSelect } from "@/components/ui/field";
import { AppointmentList } from "@/components/appointment-list";

export const metadata: Metadata = { title: "Appointments" };

const UPCOMING_TAKE = 120;

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ artistId?: string; status?: string }>;
}) {
  const { shop } = await requireShop();
  const params = await searchParams;
  const todayKey = shopTodayKey(shop.timezone);
  const { start, end } = dayBounds(todayKey, shop.timezone);
  const timezoneLabel = shop.timezone.replace(/_/g, " ");

  const artists = await prisma.artist.findMany({
    where: { shopId: shop.id },
    orderBy: { name: "asc" },
  });

  const scoped = {
    shopId: shop.id,
    ...(params.artistId ? { artistId: params.artistId } : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  const [todays, upcoming] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...scoped, startAt: { gte: start, lte: end } },
      include: { client: true, artist: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { ...scoped, startAt: { gt: end } },
      include: { client: true, artist: true },
      orderBy: { startAt: "asc" },
      take: UPCOMING_TAKE,
    }),
  ]);

  const upcomingDays = groupByShopDay(upcoming, shop.timezone);
  const filtered = Boolean(params.artistId || params.status);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Appointments"
        description={`Today's chair list in ${timezoneLabel}, then what's booked next. Open a row to edit or add notes.`}
        actions={
          <Button asChild>
            <Link href="/appointments/new">New appointment</Link>
          </Button>
        }
      />

      <form className="flex flex-col gap-2 sm:flex-row" action="/appointments">
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
          {APPOINTMENT_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Today</CardTitle>
            <CardDescription>
              {formatShopDate(zonedDateTime(todayKey, "12:00", shop.timezone), shop.timezone, "EEEE, MMMM d")}
            </CardDescription>
          </div>
          <Badge>{todays.length}</Badge>
        </CardHeader>
        <CardContent className={todays.length === 0 ? undefined : "border-t border-line px-0 py-0"}>
          {todays.length === 0 ? (
            <EmptyState
              title={filtered ? "No appointments today for this filter" : "Nothing on the books today"}
              body={
                filtered
                  ? "Clear the artist or status filter, or book a consult, session, or touch-up."
                  : "Walk-ins and leftover consults can be added as they land."
              }
              action={
                <Button asChild size="sm">
                  <Link href="/appointments/new">Book appointment</Link>
                </Button>
              }
            />
          ) : (
            <AppointmentList appointments={todays} timezone={shop.timezone} />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-ink">Upcoming</h2>
            <p className="text-sm text-muted">After today, grouped by shop date</p>
          </div>
          <Badge>{upcoming.length}{upcoming.length === UPCOMING_TAKE ? "+" : ""}</Badge>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            title={filtered ? "No upcoming appointments for this filter" : "Nothing booked after today"}
            body={
              filtered
                ? "Try another artist or status, or book the next consult or session."
                : "Future consults, sessions, and touch-ups will list here once they are on the book."
            }
            action={
              <Button asChild size="sm">
                <Link href="/appointments/new">New appointment</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {upcomingDays.map((group) => (
              <div key={group.dayKey} className="overflow-hidden rounded-xl border border-line bg-surface">
                <h3 className="border-b border-line bg-paper/80 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted">
                  {formatShopDate(
                    zonedDateTime(group.dayKey, "12:00", shop.timezone),
                    shop.timezone,
                    "EEEE, MMM d",
                  )}
                </h3>
                <AppointmentList appointments={group.items} timezone={shop.timezone} />
              </div>
            ))}
            {upcoming.length === UPCOMING_TAKE ? (
              <p className="text-sm text-muted">Showing the next {UPCOMING_TAKE} bookings after today.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
