import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArtistLoginFields } from "./artist-login";

describe("parseArtistLoginFields", () => {
  it("skips login when the checkbox is off", () => {
    const result = parseArtistLoginFields({
      createLogin: false,
      name: "Rin",
      email: "",
      password: "",
      role: "staff",
    });
    assert.deepEqual(result, { wantsLogin: false });
  });

  it("requires a login email when creating a login", () => {
    const result = parseArtistLoginFields({
      createLogin: true,
      name: "Rin",
      email: "",
      password: "",
      role: "staff",
    });
    assert.equal(result.wantsLogin, true);
    assert.equal("error" in result && result.error, "Enter a login email, or uncheck Create a shop login.");
  });

  it("rejects owner on the artist path", () => {
    const result = parseArtistLoginFields({
      createLogin: true,
      name: "Rin",
      email: "rin@blackbird.ink",
      password: "temporary-pass",
      role: "owner",
    });
    assert.equal(result.wantsLogin, true);
    assert.equal(
      "error" in result && result.error,
      "Create staff or admin here. Use Admin → Users if you need another owner.",
    );
  });

  it("generates a password when left blank", () => {
    const result = parseArtistLoginFields({
      createLogin: true,
      name: "Rin Vale",
      email: "rin@blackbird.ink",
      password: "  ",
      role: "staff",
    });
    assert.equal(result.wantsLogin, true);
    assert.ok("login" in result);
    if ("login" in result) {
      assert.equal(result.login.email, "rin@blackbird.ink");
      assert.equal(result.login.role, "staff");
      assert.equal(result.login.password.length, 12);
    }
  });
});
