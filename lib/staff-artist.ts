import { prisma } from "@/lib/prisma";
import { pickArtistForUser, type ArtistMatch, type RosterArtist } from "@/lib/artist-match";

/** Shop-scoped roster lookup for staff earnings. Never queries another parlor. */
export async function findStaffArtist(
  shopId: string,
  user: { id: string; name: string },
): Promise<ArtistMatch<RosterArtist>> {
  const artists = await prisma.artist.findMany({
    where: { shopId },
    select: { id: true, name: true, userId: true },
  });
  return pickArtistForUser(user, artists);
}
