import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatShopDateTime } from "@/lib/dates";
import { serviceLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";

export type ClientAppointmentItem = {
  id: string;
  startAt: Date;
  serviceType: string;
  status: string;
  artist: { name: string };
};

export function ClientAppointmentHistory({
  appointments,
  timezone,
  clientId,
}: {
  appointments: ClientAppointmentItem[];
  timezone: string;
  clientId: string;
}) {
  const now = new Date();
  const upcoming = appointments.filter((appointment) => appointment.startAt >= now).slice().reverse();
  const past = appointments.filter((appointment) => appointment.startAt < now);
  const bookHref = `/appointments/new?clientId=${clientId}`;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Appointments</CardTitle>
          <CardDescription>Every booking for this client — upcoming and past.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{appointments.length}</Badge>
          <Button asChild size="sm">
            <Link href={bookHref}>Book</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className={appointments.length === 0 ? undefined : "border-t border-line px-0 py-0"}>
        {appointments.length === 0 ? (
          <EmptyState
            title="No appointments yet"
            body="Book this client against an artist when they are ready."
            action={
              <Button asChild size="sm">
                <Link href={bookHref}>Book appointment</Link>
              </Button>
            }
          />
        ) : (
          <div>
            {upcoming.length > 0 ? (
              <AppointmentGroup title="Upcoming" appointments={upcoming} timezone={timezone} />
            ) : null}
            {past.length > 0 ? (
              <AppointmentGroup
                title="Past"
                appointments={past}
                timezone={timezone}
                bordered={upcoming.length > 0}
              />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentGroup({
  title,
  appointments,
  timezone,
  bordered = false,
}: {
  title: string;
  appointments: ClientAppointmentItem[];
  timezone: string;
  bordered?: boolean;
}) {
  return (
    <section className={bordered ? "border-t border-line" : undefined}>
      <h3 className="bg-paper/80 px-5 py-2 text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <ul className="divide-y divide-line">
        {appointments.map((appointment) => (
          <li key={appointment.id}>
            <Link
              href={`/appointments/${appointment.id}`}
              aria-label={`Open appointment on ${formatShopDateTime(appointment.startAt, timezone)}`}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-paper/70"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{formatShopDateTime(appointment.startAt, timezone)}</p>
                <p className="text-sm text-muted">
                  {appointment.artist.name} · {serviceLabel(appointment.serviceType)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={appointment.status} />
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
