import { isPostgresUrl, isSqliteUrl, parseDatabaseFingerprint } from "./database-url";

export type HealthDb = {
  ping: () => Promise<void>;
  countShops: () => Promise<number>;
  countUsers: () => Promise<number>;
  countPlatformUsers: () => Promise<number>;
  userExists: (email: string) => Promise<boolean>;
  platformUserExists: (email: string) => Promise<boolean>;
};

export type HealthBody = {
  status: "ok" | "error";
  message?: string;
  database: {
    ok: boolean;
    host: string;
    name: string;
    port: string;
  };
  counts?: {
    shops: number;
    users: number;
    platformUsers: number;
  };
  probe?: {
    email: string;
    exists: boolean;
  };
};

export type HealthResult = {
  status: number;
  body: HealthBody;
};

function fingerprintFields(databaseUrl: string | undefined) {
  const parsed = parseDatabaseFingerprint(databaseUrl);
  return { ok: false, ...parsed };
}

function errorResult(message: string, databaseUrl: string | undefined): HealthResult {
  return {
    status: 503,
    body: {
      status: "error",
      message,
      database: fingerprintFields(databaseUrl),
    },
  };
}

export function normalizeHealthEmail(email: string | null | undefined): string | undefined {
  const value = email?.trim().toLowerCase() ?? "";
  return value || undefined;
}

export async function runHealthCheck(input: {
  databaseUrl: string | undefined;
  email?: string | null;
  db?: HealthDb;
  loadDb?: () => Promise<HealthDb>;
}): Promise<HealthResult> {
  const raw = input.databaseUrl?.trim() ?? "";
  const probeEmail = normalizeHealthEmail(input.email);

  if (!raw) {
    return errorResult("DATABASE_URL is not set.", input.databaseUrl);
  }
  if (isSqliteUrl(raw) || !isPostgresUrl(raw)) {
    return errorResult("DATABASE_URL is not PostgreSQL.", input.databaseUrl);
  }

  const parsed = parseDatabaseFingerprint(raw);
  if (!parsed.host) {
    return errorResult("DATABASE_URL is not a valid PostgreSQL URL.", input.databaseUrl);
  }

  let db: HealthDb;
  try {
    db = input.db ?? (await input.loadDb?.());
    if (!db) {
      return errorResult("Database client is not available.", input.databaseUrl);
    }
  } catch {
    return errorResult("Database client failed to load.", input.databaseUrl);
  }

  try {
    await db.ping();
    const [shops, users, platformUsers] = await Promise.all([
      db.countShops(),
      db.countUsers(),
      db.countPlatformUsers(),
    ]);

    const body: HealthBody = {
      status: "ok",
      database: { ok: true, ...parsed },
      counts: { shops, users, platformUsers },
    };

    if (probeEmail) {
      const [user, platformUser] = await Promise.all([
        db.userExists(probeEmail),
        db.platformUserExists(probeEmail),
      ]);
      body.probe = { email: probeEmail, exists: user || platformUser };
    }

    return { status: 200, body };
  } catch {
    return errorResult("Database query failed.", input.databaseUrl);
  }
}
