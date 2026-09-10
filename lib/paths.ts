import path from "node:path";

/** Local parlor image root. Override with STORAGE_ROOT (Render disk: /var/data/storage). Database is Postgres, not this directory. */
export function storageRoot() {
  const fromEnv = process.env.STORAGE_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "storage");
}

/**
 * Resolve a stored key against the current STORAGE_ROOT.
 * Call at read/write time — do not cache the root across boots or tests.
 * Rejects keys that escape the root (so a bad DB row cannot read /etc/passwd).
 */
export function absoluteStoragePath(storageKey: string) {
  const root = storageRoot();
  const abs = path.resolve(root, storageKey);
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid storage key.");
  }
  return abs;
}
