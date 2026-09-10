import type { Metadata } from "next";
import { isAdminRole, requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ArtistForm } from "@/components/forms/artist-form";
import { FlashNotice } from "@/components/flash-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const canCreateLogin = isAdminRole(session.role);
  const [artists, users] = await Promise.all([
    prisma.artist.findMany({
      where: { shopId: shop.id },
      include: { _count: { select: { appointments: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    canCreateLogin
      ? prisma.user.findMany({
          where: { shopId: shop.id },
          select: { name: true, email: true, role: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Artists"
        description={
          canCreateLogin
            ? "Who is on the floor, what they do, and whether they are taking work. You can also create a shop login here so the artist can sign in at /login."
            : "Who is on the floor, what they do, and whether they are taking work."
        }
      />

      <FlashNotice saved={saved} message="Artist roster saved." />

      <Card className="max-w-3xl">
        <CardHeader>
          <div>
            <CardTitle>Add to the roster</CardTitle>
            <CardDescription className="mt-1">
              {canCreateLogin
                ? "Roster name is for the calendar. Login email is the account they type at /login."
                : "Add the people who hold the machines so you can put names on the calendar."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ArtistForm canCreateLogin={canCreateLogin} />
        </CardContent>
      </Card>

      {artists.length === 0 ? (
        <EmptyState
          title="No artists yet"
          body="Add the people who hold the machines so you can put names on the calendar."
        />
      ) : (
        <div className="grid gap-4">
          {artists.map((artist) => {
            const matchingLogins = users.filter(
              (user) => user.name.trim().toLowerCase() === artist.name.trim().toLowerCase(),
            );
            return (
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
                    canCreateLogin={canCreateLogin}
                    matchingLogins={matchingLogins.map((user) => ({
                      email: user.email,
                      role: user.role,
                    }))}
                    defaultValues={{
                      name: artist.name,
                      specialty: artist.specialty,
                      active: artist.active,
                    }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
