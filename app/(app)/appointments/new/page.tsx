import type { Metadata } from "next";
import Link from "next/link";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shopTodayKey } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";

export const metadata: Metadata = { title: "New appointment" };

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { shop } = await requireShop();
  const { clientId } = await searchParams;
  const [clients, artists] = await Promise.all([
    prisma.client.findMany({ where: { shopId: shop.id }, orderBy: { name: "asc" } }),
    prisma.artist.findMany({
      where: { shopId: shop.id, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Book appointment"
        description="Put a client on an artist's chair. Deposits are recorded here; cards are not charged."
        actions={
          <Button asChild variant="outline">
            <Link href="/appointments">Back to appointments</Link>
          </Button>
        }
      />
      <Card className="max-w-3xl">
        <CardContent className="pt-5">
          {clients.length === 0 || artists.length === 0 ? (
            <EmptyState
              title={clients.length === 0 ? "Add a client first" : "Add an active artist first"}
              body="Appointments need both a person in the book and someone on the roster."
              action={
                <Button asChild>
                  <Link href={clients.length === 0 ? "/clients/new" : "/artists"}>
                    {clients.length === 0 ? "Add client" : "Go to artists"}
                  </Link>
                </Button>
              }
            />
          ) : (
            <AppointmentForm
              idempotencyKey={crypto.randomUUID()}
              clients={clients.map((client) => ({ id: client.id, name: client.name }))}
              artists={artists.map((artist) => ({
                id: artist.id,
                name: artist.name,
                hint: artist.specialty || undefined,
              }))}
              defaultValues={{
                clientId: clientId ?? "",
                artistId: "",
                date: shopTodayKey(shop.timezone),
                time: "12:00",
                durationMin: 60,
                serviceType: "tattoo",
                status: "scheduled",
                depositCents: 10000,
                depositPaid: false,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
