import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayKeyInZone, formatShopDateTime, timeValueInZone } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { NoteForm } from "@/components/forms/note-form";
import { DepositButton } from "@/components/deposit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Appointment" };

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { shop } = await requireShop();
  const { id } = await params;
  const appointment = await prisma.appointment.findFirst({
    where: { id, shopId: shop.id },
    include: {
      client: true,
      artist: true,
      sessionNotes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!appointment) {
    notFound();
  }

  const [clients, artists] = await Promise.all([
    prisma.client.findMany({ where: { shopId: shop.id }, orderBy: { name: "asc" } }),
    prisma.artist.findMany({
      where: { shopId: shop.id },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={appointment.client.name}
        description={`${formatShopDateTime(appointment.startAt, shop.timezone)} with ${appointment.artist.name}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/appointments">Calendar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/clients/${appointment.clientId}`}>Client card</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {appointment.depositCents > 0 ? (
          <Badge tone={appointment.depositPaid ? "olive" : "gold"}>
            {appointment.depositPaid
              ? `${formatMoney(appointment.depositCents)} deposit paid`
              : `${formatMoney(appointment.depositCents)} deposit unpaid`}
          </Badge>
        ) : (
          <Badge>No deposit</Badge>
        )}
        {!appointment.depositPaid && appointment.depositCents > 0 ? (
          <DepositButton appointmentId={appointment.id} />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentForm
              appointmentId={appointment.id}
              clients={clients.map((client) => ({ id: client.id, name: client.name }))}
              artists={artists.map((artist) => ({
                id: artist.id,
                name: artist.name,
                hint: artist.active ? artist.specialty || undefined : "inactive",
              }))}
              defaultValues={{
                clientId: appointment.clientId,
                artistId: appointment.artistId,
                date: dayKeyInZone(appointment.startAt, shop.timezone),
                time: timeValueInZone(appointment.startAt, shop.timezone),
                durationMin: appointment.durationMin,
                serviceType: appointment.serviceType,
                status: appointment.status,
                depositCents: appointment.depositCents,
                depositPaid: appointment.depositPaid,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <NoteForm clientId={appointment.clientId} appointmentId={appointment.id} />
            {appointment.sessionNotes.length === 0 ? (
              <p className="text-sm text-muted">No notes on this booking yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {appointment.sessionNotes.map((note) => (
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
  );
}
