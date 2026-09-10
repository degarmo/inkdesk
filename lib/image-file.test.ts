import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asUploadFile,
  contentDisposition,
  imageDownloadName,
  loginNextForImage,
  wantsDownload,
} from "./image-file";
import { safeLoginNext } from "./utils";

describe("asUploadFile", () => {
  it("rejects missing, empty, and string parts", () => {
    assert.deepEqual(asUploadFile(null), { error: "Choose a JPEG, PNG, or WebP image." });
    assert.deepEqual(asUploadFile(""), { error: "Choose a JPEG, PNG, or WebP image." });
    assert.deepEqual(asUploadFile({ size: 0, arrayBuffer: async () => new ArrayBuffer(0) }), {
      error: "Choose a JPEG, PNG, or WebP image.",
    });
  });

  it("accepts a File-like object that is not instanceof File", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const part = {
      size: 3,
      type: "image/png",
      arrayBuffer: async () => bytes.buffer,
    };
    const file = asUploadFile(part);
    assert.ok(!("error" in file));
    if ("error" in file) return;
    assert.equal(file.size, 3);
    assert.equal(file.type, "image/png");
    assert.equal((await file.arrayBuffer()).byteLength, 3);
  });
});

describe("download headers", () => {
  it("detects ?download=1", () => {
    assert.equal(wantsDownload("https://inkdesk.example/api/images/abc?download=1"), true);
    assert.equal(wantsDownload("https://inkdesk.example/api/images/abc"), false);
    assert.equal(wantsDownload("https://inkdesk.example/api/images/abc?download=0"), false);
  });

  it("keeps download=1 on the post-login next path", () => {
    assert.equal(loginNextForImage("img-1", false), "/api/images/img-1");
    assert.equal(loginNextForImage("img-1", true), "/api/images/img-1?download=1");
    assert.equal(safeLoginNext("/api/images/img-1"), "/api/images/img-1");
    assert.equal(safeLoginNext("/api/images/img-1?download=1"), "/api/images/img-1?download=1");
    assert.equal(safeLoginNext("/api/images/img-1?download=1&other=2"), null);
    assert.equal(safeLoginNext("/dashboard"), null);
  });

  it("builds a stable attachment filename from caption and kind", () => {
    assert.equal(
      imageDownloadName({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        kind: "reference",
        caption: "Shoulder botanical, client’s ref",
        mimeType: "image/jpeg",
        storageKey: "shops/s/clients/c/a1b2c3d4.jpg",
      }),
      "shoulder-botanical-clients-ref-a1b2c3d4.jpg",
    );
    assert.equal(
      imageDownloadName({
        id: "zzzzzzzz-xxxx",
        kind: "design",
        caption: "",
        mimeType: "image/png",
      }),
      "design-zzzzzzzz.png",
    );
  });

  it("emits Content-Disposition with filename and filename*", () => {
    assert.equal(
      contentDisposition("design-abcd.png", "attachment"),
      `attachment; filename="design-abcd.png"; filename*=UTF-8''design-abcd.png`,
    );
    assert.match(contentDisposition("ref.jpg", "inline"), /^inline; filename="ref.jpg"/);
  });
});
