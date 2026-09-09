import path from "node:path";

/** Local parlor image root. Override with STORAGE_ROOT (Render disk: /var/data/storage). Database is Postgres, not this directory. */
export function storageRoot() {
  const fromEnv = process.env.STORAGE_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "storage");
}
