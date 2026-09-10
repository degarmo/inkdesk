/** Safe DATABASE_URL helpers. Never return user, password, or the raw URL. */

export type DatabaseFingerprint = {
  host: string;
  name: string;
  port: string;
};

const SQLITE_SCHEMES = new Set(["file", "sqlite", "sqlite3"]);
const POSTGRES_SCHEMES = new Set(["postgres", "postgresql"]);

function schemeOf(raw: string): string {
  return raw.trim().split(":", 1)[0]?.toLowerCase() ?? "";
}

export function isSqliteUrl(raw: string): boolean {
  const value = raw.trim();
  return value.startsWith("file:") || SQLITE_SCHEMES.has(schemeOf(value));
}

export function isPostgresUrl(raw: string): boolean {
  return POSTGRES_SCHEMES.has(schemeOf(raw));
}

/**
 * Host, database name (URL pathname, leading slashes stripped), and port.
 * Userinfo is discarded. Invalid / SQLite URLs return empty fields.
 */
export function parseDatabaseFingerprint(raw: string | undefined | null): DatabaseFingerprint {
  const empty = { host: "", name: "", port: "" };
  const value = raw?.trim() ?? "";
  if (!value || isSqliteUrl(value)) {
    return empty;
  }
  try {
    const url = new URL(value);
    const name = decodeURIComponent(url.pathname.replace(/^\/+/, "").split("/")[0] ?? "");
    const port = url.port || (isPostgresUrl(value) ? "5432" : "");
    return { host: url.hostname, name, port };
  } catch {
    return empty;
  }
}
