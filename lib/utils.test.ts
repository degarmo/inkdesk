import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicImagePath, safeLoginNext } from "./utils";

describe("publicImagePath", () => {
  it("builds review and download URLs", () => {
    assert.equal(publicImagePath("img_1"), "/api/images/img_1");
    assert.equal(publicImagePath("img_1", true), "/api/images/img_1?download=1");
  });
});

describe("safeLoginNext", () => {
  it("allows parlor image review and download return paths", () => {
    assert.equal(safeLoginNext("/api/images/abc123"), "/api/images/abc123");
    assert.equal(safeLoginNext("/api/images/abc123?download=1"), "/api/images/abc123?download=1");
  });

  it("rejects other next targets", () => {
    assert.equal(safeLoginNext("/dashboard"), null);
    assert.equal(safeLoginNext("/api/images/abc123?download=1&other=2"), null);
    assert.equal(safeLoginNext("https://evil.example/api/images/abc"), null);
  });
});
