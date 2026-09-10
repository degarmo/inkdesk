import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatShopDate } from "@/lib/dates";
import { formatPhone, parseTags, tagLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type ClientListItem = {
  id: string;
  name: string;
  phone: string;
  email: string;
  tags: string;
  lastVisit: Date | null;
  _count: { appointments: number };
};

function bookingLabel(count: number) {
  return count === 1 ? "1 booking" : `${count} bookings`;
}

export function ClientList({
  clients,
  timezone,
}: {
  clients: ClientListItem[];
  timezone: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="hidden border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_7.5rem_6.5rem_1.25rem] md:items-center md:gap-3 md:px-4 md:py-3">
        <span className="font-medium">Name</span>
        <span className="font-medium">Contact</span>
        <span className="font-medium">Tags</span>
        <span className="font-medium">Last visit</span>
        <span className="font-medium">Bookings</span>
        <span className="sr-only">Open client</span>
      </div>
      <ul className="divide-y divide-line">
        {clients.map((client) => {
          const tags = parseTags(client.tags);
          return (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                aria-label={`Open ${client.name}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-paper/70 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_7.5rem_6.5rem_1.25rem]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{client.name}</p>
                  <p className="text-sm text-muted md:hidden">
                    {client.phone ? formatPhone(client.phone) : "No phone"}
                    {" · "}
                    {bookingLabel(client._count.appointments)}
                  </p>
                </div>
                <div className="hidden min-w-0 text-sm text-muted md:block">
                  <p>{client.phone ? formatPhone(client.phone) : "—"}</p>
                  {client.email ? <p className="truncate">{client.email}</p> : null}
                </div>
                <div className="hidden flex-wrap gap-1 md:flex">
                  {tags.map((tag) => (
                    <Badge key={tag}>{tagLabel(tag)}</Badge>
                  ))}
                </div>
                <p className="hidden text-sm text-muted md:block">
                  {client.lastVisit ? formatShopDate(client.lastVisit, timezone) : "—"}
                </p>
                <p className="hidden text-sm text-muted md:block">{bookingLabel(client._count.appointments)}</p>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
