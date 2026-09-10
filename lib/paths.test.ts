import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { absoluteStoragePath, storageRoot } from "./paths";

const original = process.env.STORAGE_ROOT;

afterEach(() => {
  if (original === undefined) delete process.env.STORAGE_ROOT;
  else process.env.STORAGE_ROOT = original;
});

describe("storageRoot", () => {
  it("defaults to cwd/storage when STORAGE_ROOT is unset", () => {
    delete process.env.STORAGE_ROOT;
    assert.equal(storageRoot(), path.join(process.cwd(), "storage"));
  });

  it("resolves STORAGE_ROOT at call time, not from a stale import", () => {
    process.env.STORAGE_ROOT = "/var/data/storage";
    assert.equal(storageRoot(), path.resolve("/var/data/storage"));
    process.env.STORAGE_ROOT = "/tmp/other-disk";
    assert.equal(storageRoot(), path.resolve("/tmp/other-disk"));
  });

  it("trims the env value", () => {
    process.env.STORAGE_ROOT = "  /var/data/storage  ";
    assert.equal(storageRoot(), path.resolve("/var/data/storage"));
  });
});

describe("absoluteStoragePath", () => {
  it("joins the live root with a shop-scoped key", () => {
    process.env.STORAGE_ROOT = "/var/data/storage";
    assert.equal(
      absoluteStoragePath("shops/s1/clients/c1/img.jpg"),
      path.resolve("/var/data/storage", "shops/s1/clients/c1/img.jpg"),
    );
  });

  it("rejects keys that escape the storage root", () => {
    process.env.STORAGE_ROOT = "/var/data/storage";
    assert.throws(() => absoluteStoragePath("../etc/passwd"), /Invalid storage key/);
    assert.throws(() => absoluteStoragePath("/etc/passwd"), /Invalid storage key/);
  });

  it("round-trips a file under an overridden STORAGE_ROOT", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "inkdesk-storage-"));
    process.env.STORAGE_ROOT = dir;
    try {
      const key = "shops/s1/clients/c1/img.bin";
      const abs = absoluteStoragePath(key);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, Buffer.from("inkdesk"));
      assert.equal((await readFile(abs)).toString(), "inkdesk");
      assert.ok(abs.startsWith(path.resolve(dir)));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
