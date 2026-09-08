import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatShopDateTime } from "@/lib/dates";
import { parseTags, serviceLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/forms/client-form";
import { NoteForm } from "@/components/forms/note-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/field";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { shop } = await requireShop();
  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, shopId: shop.id },
    include: {
      appointments: {
        include: { artist: true },
        orderBy: { startAt: "desc" },
      },
      sessionNotes: {
        include: { appointment: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={client.name}
        description="Profile, bookings, and chair notes."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/clients">All clients</Link>
            </Button>
            <Button asChild>
              <Link href={`/appointments/new?clientId=${client.id}`}>Book</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Client details</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm
              clientId={client.id}
              defaultValues={{
                name: client.name,
                phone: client.phone,
                email: client.email,
                notes: client.notes,
                tags: parseTags(client.tags),
              }}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {client.appointments.length === 0 ? (
                <EmptyState
                  title="No appointments yet"
                  body="Book this client against an artist when they are ready."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {client.appointments.map((appointment) => (
                    <li key={appointment.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {formatShopDateTime(appointment.startAt, shop.timezone)}
                        </p>
                        <p className="text-sm text-muted">
                          {appointment.artist.name} · {serviceLabel(appointment.serviceType)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={appointment.status} />
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

          <Card>
            <CardHeader>
              <CardTitle>Session notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <NoteForm
                clientId={client.id}
                appointments={client.appointments.map((appointment) => ({
                  id: appointment.id,
                  label: `${formatShopDateTime(appointment.startAt, shop.timezone)} · ${serviceLabel(appointment.serviceType)}`,
                }))}
              />
              {client.sessionNotes.length === 0 ? (
                <p className="text-sm text-muted">No chair notes yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {client.sessionNotes.map((note) => (
                    <li key={note.id} className="grid gap-1 py-3">
                      <p className="text-xs text-muted">
                        {formatShopDateTime(note.createdAt, shop.timezone)}
                        {note.placement ? ` · ${note.placement}` : ""}
                        {note.aftercareGiven ? " · aftercare given" : ""}
                      </p>
                      {note.designNotes ? <p className="text-sm text-ink">{note.designNotes}</p> : null}
                      {note.inkColors ? <p className="text-sm text-muted">Ink: {note.inkColors}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
