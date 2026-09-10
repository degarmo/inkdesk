import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  imageContentHeaders,
  imageDownloadFilename,
  readFormUpload,
  readShopImage,
  validateUploadBytes,
  wantsImageDownload,
  writeShopImage,
} from "./image-store";
import { storageKeyFor } from "./paths";

const PNG_1X1 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc00000000300010005fed4ef0000000049454e44ae426082",
  "hex",
);

function jpegLike(bytes = 32) {
  const buf = Buffer.alloc(bytes, 0);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return buf;
}

async function withStorageRoot<T>(fn: (root: string) => Promise<T>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "inkdesk-img-"));
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

describe("readFormUpload", () => {
  it("accepts a File and a Blob, not only instanceof File", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "ref.jpg", { type: "image/jpeg" });
    const fromFile = await readFormUpload(file);
    assert.ok(!("error" in fromFile));
    assert.equal(fromFile.bytes.length, 4);
    assert.equal(fromFile.type, "image/jpeg");

    const blob = new Blob([new Uint8Array([9, 8, 7])], { type: "image/png" });
    const fromBlob = await readFormUpload(blob);
    assert.ok(!("error" in fromBlob));
    assert.deepEqual([...fromBlob.bytes], [9, 8, 7]);
  });

  it("rejects empty or missing files", async () => {
    assert.equal("error" in (await readFormUpload("")), true);
    assert.equal("error" in (await readFormUpload(null)), true);
    const empty = new File([], "empty.jpg", { type: "image/jpeg" });
    assert.equal("error" in (await readFormUpload(empty)), true);
  });
});

describe("validateUploadBytes", () => {
  it("accepts a PNG and records dimensions", () => {
    const result = validateUploadBytes(PNG_1X1, "image/png");
    assert.ok(!("error" in result));
    assert.equal(result.mime, "image/png");
    assert.equal(result.ext, "png");
    assert.equal(result.width, 1);
    assert.equal(result.height, 1);
  });

  it("accepts a JPEG sniff without a declared mime", () => {
    const result = validateUploadBytes(jpegLike());
    assert.ok(!("error" in result));
    assert.equal(result.mime, "image/jpeg");
  });

  it("rejects HEIC by declared type", () => {
    const result = validateUploadBytes(jpegLike(), "image/heic");
    assert.ok("error" in result);
    assert.match(result.error, /HEIC/i);
  });
});

describe("writeShopImage / readShopImage", () => {
  it("persists bytes under STORAGE_ROOT using the POSIX shop key", async () => {
    await withStorageRoot(async (root) => {
      const key = storageKeyFor("shop1", "client1", "img1", "png");
      const abs = await writeShopImage(key, PNG_1X1);
      assert.ok(abs.startsWith(path.resolve(root) + path.sep));
      const read = await readShopImage(key);
      assert.deepEqual(read, PNG_1X1);
    });
  });
});

describe("image download headers", () => {
  it("builds an attachment filename from caption and kind", () => {
    assert.equal(
      imageDownloadFilename({
        id: "abcdefghijklmnop",
        kind: "design",
        caption: "Shoulder botanical, client’s ref",
        mimeType: "image/jpeg",
        storageKey: "shops/s/clients/c/abcdefghijklmnop.jpg",
      }),
      "shoulder-botanical-client-s-ref-abcdefgh.jpg",
    );
  });

  it("sets Content-Disposition attachment only when downloading", () => {
    const inline = imageContentHeaders({
      mimeType: "image/png",
      byteLength: 12,
      filename: "photo-abc.png",
      download: false,
    });
    assert.equal(inline["Content-Disposition"], 'inline; filename="photo-abc.png"');
    const attach = imageContentHeaders({
      mimeType: "image/png",
      byteLength: 12,
      filename: "photo-abc.png",
      download: true,
    });
    assert.equal(attach["Content-Disposition"], 'attachment; filename="photo-abc.png"');
  });

  it("treats download=1 as a download request", () => {
    assert.equal(wantsImageDownload({ url: "https://inkdesk.example/api/images/abc?download=1" }), true);
    assert.equal(wantsImageDownload({ url: "https://inkdesk.example/api/images/abc" }), false);
  });
});
