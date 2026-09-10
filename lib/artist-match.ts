export type RosterArtist = {
  id: string;
  name: string;
  userId: string | null;
};

export type ArtistMatchVia = "userId" | "name";

export type ArtistMatch<T extends RosterArtist = RosterArtist> = {
  artist: T;
  via: ArtistMatchVia;
} | {
  artist: null;
  via: null;
};

/** Collapse inner whitespace and compare case-insensitively. */
export function normalizePersonName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Attribute a parlor login to a roster chair.
 *
 * 1. Prefer `Artist.userId` (durable, shop-safe because User is already shop-scoped).
 * 2. Temporary fallback: exactly one same-shop artist whose normalized name equals the login name.
 *    Zero or duplicate name matches are not attributed — never mix another chair’s payments.
 */
export function pickArtistForUser<T extends RosterArtist>(
  user: { id: string; name: string },
  artists: T[],
): ArtistMatch<T> {
  const byUserId = artists.find((artist) => artist.userId === user.id);
  if (byUserId) {
    return { artist: byUserId, via: "userId" };
  }

  const needle = normalizePersonName(user.name);
  if (!needle) {
    return { artist: null, via: null };
  }
  const nameHits = artists.filter(
    (artist) => artist.userId == null && normalizePersonName(artist.name) === needle,
  );
  if (nameHits.length === 1) {
    return { artist: nameHits[0], via: "name" };
  }
  return { artist: null, via: null };
}

export function artistMatchHint(via: ArtistMatchVia | null, artistName: string | null) {
  if (via === "userId" && artistName) {
    return `Collected Checkout on ${artistName}’s chair (linked login).`;
  }
  if (via === "name" && artistName) {
    return `Collected Checkout on ${artistName}’s chair (unique name match in this parlor — temporary until the roster login is set).`;
  }
  return "No roster chair is linked to this login, so there is no attributed haul. Owners can set the artist name to match the login, or link the login on the roster.";
}
