import type { Metadata } from "next";
import { isAdminRole, requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ArtistForm } from "@/components/forms/artist-form";
import { FlashNotice } from "@/components/flash-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/field";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { shop, session } = await requireShop();
  const { saved } = await searchParams;
  const canManage = isAdminRole(session.role);
  const artists = await prisma.artist.findMany({
    where: { shopId: shop.id },
    include: { _count: { select: { appointments: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Artists"
        description={
          canManage
            ? "Who is on the floor, what they do, and whether they are taking work."
            : "Who is on the floor. Owners and admins add names to the roster."
        }
      />

      {canManage ? <FlashNotice saved={saved} message="Artist roster saved." /> : null}

      {canManage ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Add to the roster</CardTitle>
          </CardHeader>
          <CardContent>
            <ArtistForm />
          </CardContent>
        </Card>
      ) : null}

      {artists.length === 0 ? (
        <EmptyState
          title="No artists yet"
          body={
            canManage
              ? "Add the people who hold the machines so you can put names on the calendar."
              : "The roster is empty. Ask an owner or admin to add chairs."
          }
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
              {canManage ? (
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
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
