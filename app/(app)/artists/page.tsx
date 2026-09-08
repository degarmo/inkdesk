import type { Metadata } from "next";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ArtistForm } from "@/components/forms/artist-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/field";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsPage() {
  const { shop } = await requireShop();
  const artists = await prisma.artist.findMany({
    where: { shopId: shop.id },
    include: { _count: { select: { appointments: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Artists"
        description="Who is on the floor, what they do, and whether they are taking work."
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Add to the roster</CardTitle>
        </CardHeader>
        <CardContent>
          <ArtistForm />
        </CardContent>
      </Card>

      {artists.length === 0 ? (
        <EmptyState
          title="No artists yet"
          body="Add the people who hold the machines so you can put names on the calendar."
        />
      ) : (
        <div className="grid gap-4">
          {artists.map((artist) => (
            <Card key={artist.id}>
              <CardHeader>
                <div>
                  <CardTitle>{artist.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    {artist.specialty || "No specialty listed"} · {artist._count.appointments} bookings
                  </p>
                </div>
                <Badge tone={artist.active ? "olive" : "muted"}>
                  {artist.active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <ArtistForm
                  artistId={artist.id}
                  defaultValues={{
                    name: artist.name,
                    specialty: artist.specialty,
                    active: artist.active,
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
