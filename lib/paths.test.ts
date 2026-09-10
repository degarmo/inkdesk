import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { absoluteStoragePath, storageKeyFor, storageRoot } from "./paths";

async function withStorageRoot<T>(fn: (root: string) => Promise<T>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "inkdesk-storage-"));
  const prev = process.env.STORAGE_ROOT;
  process.env.STORAGE_ROOT = root;
  try {
    return await fn(root);
  } finally {
    if (prev === undefined) delete process.env.STORAGE_ROOT;
    else process.env.STORAGE_ROOT = prev;
    await rm(root, { recursive: true, force: true });
  }
}

describe("storageRoot", () => {
  it("uses STORAGE_ROOT when set, otherwise cwd/storage", async () => {
    await withStorageRoot(async (root) => {
      assert.equal(storageRoot(), path.resolve(root));
    });
    const prev = process.env.STORAGE_ROOT;
    delete process.env.STORAGE_ROOT;
    try {
      assert.equal(storageRoot(), path.join(process.cwd(), "storage"));
    } finally {
      if (prev !== undefined) process.env.STORAGE_ROOT = prev;
    }
  });
});

describe("storageKeyFor", () => {
  it("stores a POSIX key that does not depend on the host separator", () => {
    assert.equal(
      storageKeyFor("shopA", "clientB", "imgC", "jpg"),
      "shops/shopA/clients/clientB/imgC.jpg",
    );
  });

  it("rejects path segments that could escape the shop tree", () => {
    assert.throws(() => storageKeyFor("../x", "c", "i", "jpg"));
    assert.throws(() => storageKeyFor("s", "a/b", "i", "jpg"));
  });
});

describe("absoluteStoragePath", () => {
  it("resolves under STORAGE_ROOT at call time", async () => {
    await withStorageRoot(async (root) => {
      const abs = absoluteStoragePath("shops/s1/clients/c1/img.jpg");
      assert.equal(abs, path.join(path.resolve(root), "shops", "s1", "clients", "c1", "img.jpg"));
    });
  });

  it("rejects traversal and keys outside shops/", async () => {
    await withStorageRoot(async () => {
      assert.throws(() => absoluteStoragePath("../etc/passwd"));
      assert.throws(() => absoluteStoragePath("shops/../../etc/passwd"));
      assert.throws(() => absoluteStoragePath("/tmp/other.jpg"));
      assert.throws(() => absoluteStoragePath("not-shops/file.jpg"));
    });
  });
});
