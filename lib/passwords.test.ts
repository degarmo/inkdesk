import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateTempPassword } from "./passwords";

describe("generateTempPassword", () => {
  it("returns the requested length from the unambiguous alphabet", () => {
    const password = generateTempPassword(12);
    assert.equal(password.length, 12);
    assert.match(password, /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]+$/);
    assert.doesNotMatch(password, /[0O1lI]/);
  });

  it("does not repeat the same string across calls", () => {
    const samples = new Set(Array.from({ length: 8 }, () => generateTempPassword()));
    assert.equal(samples.size, 8);
  });
});
