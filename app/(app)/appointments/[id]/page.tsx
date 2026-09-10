import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayKeyInZone, formatShopDateTime, timeValueInZone } from "@/lib/dates";
import { formatMoney, paymentStatusLabel, paymentTypeLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { NoteForm } from "@/components/forms/note-form";
import { AppointmentPayActions } from "@/components/appointment-pay-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlashNotice } from "@/components/flash-notice";
import { Badge } from "@/components/ui/badge";
import { ImageGallery } from "@/components/images/image-gallery";
import { ImageUploadForm } from "@/components/images/image-upload-form";
import { ImageLibraryPicker } from "@/components/images/image-library-picker";
import { stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Appointment" };

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; note?: string; image?: string; paid?: string; canceled?: string }>;
}) {
  const { shop, session } = await requireShop();
  const { id } = await params;
  const flash = await searchParams;
  const appointment = await prisma.appointment.findFirst({
    where: { id, shopId: shop.id },
    include: {
      client: true,
      artist: true,
      sessionNotes: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
      images: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!appointment) {
    notFound();
  }

  const [clients, artists, clientLibrary] = await Promise.all([
    prisma.client.findMany({ where: { shopId: shop.id }, orderBy: { name: "asc" } }),
    prisma.artist.findMany({
      where: { shopId: shop.id },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.clientImage.findMany({
      where: { shopId: shop.id, clientId: appointment.clientId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const attachedKeys = new Set(appointment.images.map((image) => image.storageKey));
  const attachable = clientLibrary.filter((image) => !attachedKeys.has(image.storageKey));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={appointment.client.name}
        description={`${formatShopDateTime(appointment.startAt, shop.timezone)} with ${appointment.artist.name}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/appointments">Appointments</Link>
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
      </div>

      {flash.paid === "1" ? <FlashNotice saved="1" message="Checkout finished. Stripe will confirm the payment on this parlor’s webhook." /> : null}
      {flash.canceled === "1" ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
          Checkout was canceled. No charge was made.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Collect payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AppointmentPayActions
            appointmentId={appointment.id}
            depositCents={appointment.depositCents}
            depositPaid={appointment.depositPaid}
            stripeReady={stripeConfigured(shop)}
            isAdmin={isAdminRole(session.role)}
          />
          {appointment.payments.length === 0 ? (
            <p className="text-sm text-muted">No card checkouts on this booking yet. Cash can still be marked paid.</p>
          ) : (
            <ul className="divide-y divide-line">
              {appointment.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-ink">
                    {formatMoney(payment.amountCents)} · {paymentTypeLabel(payment.type)}
                  </span>
                  <span className="text-muted">{paymentStatusLabel(payment.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <FlashNotice saved={flash.saved} message="Appointment saved." />
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
            <FlashNotice saved={flash.note} message="Session note saved." />
            <NoteForm
              clientId={appointment.clientId}
              appointmentId={appointment.id}
              idempotencyKey={crypto.randomUUID()}
            />
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

      <Card>
        <CardHeader>
          <CardTitle>Prep art</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <FlashNotice saved={flash.image} message="Prep art updated." />
          <ImageUploadForm
            clientId={appointment.clientId}
            appointmentId={appointment.id}
            redirectTo={`/appointments/${appointment.id}`}
          />
          <ImageGallery
            images={appointment.images}
            redirectTo={`/appointments/${appointment.id}`}
            emptyTitle="Nothing staged for this booking"
            emptyBody="Upload a reference or attach one from the client card so the stencil is ready at the chair."
          />
          {attachable.length > 0 ? (
            <ImageLibraryPicker
              appointmentId={appointment.id}
              redirectTo={`/appointments/${appointment.id}`}
              images={attachable}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
