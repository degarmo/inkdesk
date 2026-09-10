import path from "node:path";

/** Local parlor image root. Override with STORAGE_ROOT (Render disk: /var/data/storage). Database is Postgres, not this directory. */
export function storageRoot() {
  const fromEnv = process.env.STORAGE_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "storage");
}

function storageSegment(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "." || trimmed === ".." || /[\\/]/.test(trimmed)) {
    throw new Error(`Invalid ${label}.`);
  }
  return trimmed;
}

/** Always POSIX so a row written on one machine resolves on Render Linux. */
export function storageKeyFor(shopId: string, clientId: string, imageId: string, ext: string) {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return [
    "shops",
    storageSegment(shopId, "shop id"),
    "clients",
    storageSegment(clientId, "client id"),
    `${storageSegment(imageId, "image id")}.${safeExt}`,
  ].join("/");
}

export function absoluteStoragePath(storageKey: string) {
  const root = storageRoot();
  const parts = storageKey.split(/[/\\]+/).filter((part) => part.length > 0);
  if (parts.length === 0 || parts.some((part) => part === "." || part === "..") || parts[0] !== "shops") {
    throw new Error("Invalid storage key.");
  }
  const abs = path.resolve(root, ...parts);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return abs;
}
