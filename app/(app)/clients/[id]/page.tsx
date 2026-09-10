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
import { ClientAppointmentHistory } from "@/components/client-appointment-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlashNotice } from "@/components/flash-notice";
import { ImageGallery } from "@/components/images/image-gallery";
import { ImageUploadForm } from "@/components/images/image-upload-form";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; note?: string; image?: string }>;
}) {
  const { shop } = await requireShop();
  const { id } = await params;
  const flash = await searchParams;
  const client = await prisma.client.findFirst({
    where: { id, shopId: shop.id },
    include: {
      appointments: {
        where: { shopId: shop.id },
        include: { artist: true },
        orderBy: { startAt: "desc" },
      },
      sessionNotes: {
        where: { shopId: shop.id },
        include: { appointment: true },
        orderBy: { createdAt: "desc" },
      },
      images: {
        where: { shopId: shop.id, deletedAt: null },
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
        description="Every booking, then profile, chair notes, and references."
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

      <ClientAppointmentHistory
        appointments={client.appointments}
        timezone={shop.timezone}
        clientId={client.id}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Client details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <FlashNotice saved={flash.saved} message="Client updated." />
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

        <Card>
          <CardHeader>
            <CardTitle>Session notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FlashNotice saved={flash.note} message="Session note saved." />
            <NoteForm
              clientId={client.id}
              idempotencyKey={crypto.randomUUID()}
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

      <Card>
        <CardHeader>
          <CardTitle>References</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <FlashNotice saved={flash.image} message="References updated." />
          <ImageUploadForm clientId={client.id} redirectTo={`/clients/${client.id}`} />
          <ImageGallery
            images={client.images}
            redirectTo={`/clients/${client.id}`}
            emptyTitle="No references yet"
            emptyBody="Upload a JPEG, PNG, or WebP so the chair has the design on the screen when they sit down."
          />
        </CardContent>
      </Card>
    </div>
  );
}
