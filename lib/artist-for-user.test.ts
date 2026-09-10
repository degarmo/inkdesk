import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickArtistForUser } from "./artist-for-user";

const artists = [
  { id: "maya", name: "Maya Chen", userId: null },
  { id: "diego", name: "Diego Reyes", userId: "user_diego" },
];

describe("pickArtistForUser", () => {
  it("prefers the userId link", () => {
    const found = pickArtistForUser(artists, { id: "user_diego", name: "Someone Else" });
    assert.equal(found?.id, "diego");
  });

  it("falls back to a unique roster name match", () => {
    const found = pickArtistForUser(artists, { id: "user_maya", name: "Maya Chen" });
    assert.equal(found?.id, "maya");
  });

  it("returns null when the name is ambiguous or missing", () => {
    const dupes = [
      { id: "a", name: "Rin Vale", userId: null },
      { id: "b", name: "Rin Vale", userId: null },
    ];
    assert.equal(pickArtistForUser(dupes, { id: "x", name: "Rin Vale" }), null);
    assert.equal(pickArtistForUser(artists, { id: "x", name: "Kim Alvarez" }), null);
  });
});
