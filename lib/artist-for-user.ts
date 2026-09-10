export function pickArtistForUser<T extends { id: string; name: string; userId: string | null }>(
  artists: T[],
  user: { id: string; name: string },
): T | null {
  const linked = artists.find((artist) => artist.userId === user.id);
  if (linked) return linked;

  const name = user.name.trim().toLowerCase();
  if (!name) return null;
  const matches = artists.filter((artist) => artist.name.trim().toLowerCase() === name);
  return matches.length === 1 ? matches[0] : null;
}
