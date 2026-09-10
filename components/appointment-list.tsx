import Link from "next/link";
import { formatShopTime } from "@/lib/dates";
import { formatMoney, serviceLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";

export type AppointmentListItem = {
  id: string;
  startAt: Date;
  durationMin: number;
  serviceType: string;
  status: string;
  depositCents: number;
  depositPaid: boolean;
  client: { name: string };
  artist: { name: string };
};

export function AppointmentList({
  appointments,
  timezone,
}: {
  appointments: AppointmentListItem[];
  timezone: string;
}) {
  return (
    <ul className="divide-y divide-line">
      {appointments.map((appointment) => (
        <li key={appointment.id}>
          <AppointmentRow appointment={appointment} timezone={timezone} />
        </li>
      ))}
    </ul>
  );
}

function AppointmentRow({
  appointment,
  timezone,
}: {
  appointment: AppointmentListItem;
  timezone: string;
}) {
  return (
    <Link
      href={`/appointments/${appointment.id}`}
      className="flex flex-col gap-3 px-4 py-4 hover:bg-paper/70 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-sm font-medium text-ink">
          {formatShopTime(appointment.startAt, timezone)} · {appointment.client.name}
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
  );
}
