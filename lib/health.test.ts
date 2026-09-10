import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDatabaseFingerprint } from "./database-url";
import { normalizeHealthEmail, runHealthCheck, type HealthDb } from "./health";

const SECRET_URL =
  "postgresql://inkdesk:p%40ssw0rd-DO-NOT-LEAK@dpg-abc123-a:5432/inkdesk?schema=public";

function mockDb(overrides: Partial<HealthDb> = {}): HealthDb {
  return {
    ping: async () => undefined,
    countShops: async () => 2,
    countUsers: async () => 5,
    countPlatformUsers: async () => 1,
    userExists: async (email) => email === "owner@shop.ink",
    platformUserExists: async (email) => email === "platform@inkdesk.app",
    ...overrides,
  };
}

function assertNoSecrets(value: unknown) {
  const text = JSON.stringify(value);
  assert.doesNotMatch(text, /p%40ssw0rd|p@ssw0rd|DO-NOT-LEAK|inkdesk:p/i);
  assert.doesNotMatch(text, /passwordHash|postgresql:\/\//i);
}

describe("parseDatabaseFingerprint", () => {
  it("returns host, pathname name, and port without userinfo", () => {
    assert.deepEqual(parseDatabaseFingerprint(SECRET_URL), {
      host: "dpg-abc123-a",
      name: "inkdesk",
      port: "5432",
    });
  });

  it("defaults postgres port and accepts postgres://", () => {
    assert.deepEqual(
      parseDatabaseFingerprint("postgres://u:s3cret@internal-host/inkdesk"),
      { host: "internal-host", name: "inkdesk", port: "5432" },
    );
  });

  it("returns empty fields for missing, sqlite, and unparseable URLs", () => {
    assert.deepEqual(parseDatabaseFingerprint(undefined), {
      host: "",
      name: "",
      port: "",
    });
    assert.deepEqual(parseDatabaseFingerprint("file:/var/data/inkdesk.db"), {
      host: "",
      name: "",
      port: "",
    });
    assert.deepEqual(parseDatabaseFingerprint("sqlite:memory"), {
      host: "",
      name: "",
      port: "",
    });
    assert.deepEqual(parseDatabaseFingerprint("not a url"), {
      host: "",
      name: "",
      port: "",
    });
  });
});

describe("normalizeHealthEmail", () => {
  it("trims and lowercases; blank becomes absent", () => {
    assert.equal(normalizeHealthEmail("  Owner@Shop.INK "), "owner@shop.ink");
    assert.equal(normalizeHealthEmail("   "), undefined);
    assert.equal(normalizeHealthEmail(null), undefined);
  });
});

describe("runHealthCheck", () => {
  it("returns 503 when DATABASE_URL is missing", async () => {
    const result = await runHealthCheck({ databaseUrl: undefined, db: mockDb() });
    assert.equal(result.status, 503);
    assert.equal(result.body.status, "error");
    assert.equal(result.body.database.ok, false);
    assert.equal(result.body.message, "DATABASE_URL is not set.");
    assert.equal(result.body.counts, undefined);
  });

  it("returns 503 when DATABASE_URL is sqlite", async () => {
    const result = await runHealthCheck({
      databaseUrl: "file:/var/data/inkdesk.db",
      db: mockDb(),
    });
    assert.equal(result.status, 503);
    assert.equal(result.body.message, "DATABASE_URL is not PostgreSQL.");
    assert.deepEqual(result.body.database, { ok: false, host: "", name: "", port: "" });
  });

  it("returns fingerprint, counts, and email probe on success", async () => {
    const result = await runHealthCheck({
      databaseUrl: SECRET_URL,
      email: "  Owner@Shop.INK ",
      db: mockDb(),
    });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      status: "ok",
      database: { ok: true, host: "dpg-abc123-a", name: "inkdesk", port: "5432" },
      counts: { shops: 2, users: 5, platformUsers: 1 },
      probe: { email: "owner@shop.ink", exists: true },
    });
    assertNoSecrets(result.body);
  });

  it("probe.exists is true for a platform user as well", async () => {
    const result = await runHealthCheck({
      databaseUrl: SECRET_URL,
      email: "platform@inkdesk.app",
      db: mockDb(),
    });
    assert.equal(result.body.probe?.exists, true);
    assert.equal(result.body.probe?.email, "platform@inkdesk.app");
  });

  it("probe.exists is false when neither table has the email", async () => {
    const result = await runHealthCheck({
      databaseUrl: SECRET_URL,
      email: "missing@shop.ink",
      db: mockDb(),
    });
    assert.deepEqual(result.body.probe, { email: "missing@shop.ink", exists: false });
  });

  it("omits probe when email is absent", async () => {
    const result = await runHealthCheck({
      databaseUrl: SECRET_URL,
      db: mockDb(),
    });
    assert.equal(result.body.probe, undefined);
  });

  it("returns 503 with fingerprint and no secrets when the query fails", async () => {
    const result = await runHealthCheck({
      databaseUrl: SECRET_URL,
      email: "owner@shop.ink",
      db: mockDb({
        ping: async () => {
          throw new Error(`Can't reach postgresql://inkdesk:p%40ssw0rd-DO-NOT-LEAK@dpg-abc123-a/inkdesk`);
        },
      }),
    });
    assert.equal(result.status, 503);
    assert.equal(result.body.status, "error");
    assert.equal(result.body.message, "Database query failed.");
    assert.deepEqual(result.body.database, {
      ok: false,
      host: "dpg-abc123-a",
      name: "inkdesk",
      port: "5432",
    });
    assert.equal(result.body.probe, undefined);
    assertNoSecrets(result.body);
  });
});
