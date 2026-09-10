import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { artistMatchHint, normalizePersonName, pickArtistForUser } from "./artist-match";

const diego = { id: "a-diego", name: "Diego Reyes", userId: "u-diego" };
const maya = { id: "a-maya", name: "Maya Chen", userId: "u-maya" };
const unlinkedAlex = { id: "a-alex", name: "Alex", userId: null };
const otherAlex = { id: "a-alex-2", name: "alex", userId: null };

describe("normalizePersonName", () => {
  it("trims, collapses space, and lowercases", () => {
    assert.equal(normalizePersonName("  Diego   Reyes "), "diego reyes");
  });
});

describe("pickArtistForUser", () => {
  it("prefers userId even when names differ", () => {
    const match = pickArtistForUser(
      { id: "u-diego", name: "D. Reyes" },
      [diego, maya],
    );
    assert.deepEqual(match, { artist: diego, via: "userId" });
  });

  it("falls back to a unique same-shop name match", () => {
    const unlinkedDiego = { id: "a-diego", name: "Diego Reyes", userId: null };
    const match = pickArtistForUser(
      { id: "u-diego", name: "diego reyes" },
      [unlinkedDiego, maya],
    );
    assert.deepEqual(match, { artist: unlinkedDiego, via: "name" });
  });

  it("does not attribute when two chairs share the login name", () => {
    const match = pickArtistForUser(
      { id: "u-alex", name: "Alex" },
      [unlinkedAlex, otherAlex, maya],
    );
    assert.deepEqual(match, { artist: null, via: null });
  });

  it("does not attribute another shop’s chair (caller must pass shop-scoped rows)", () => {
    const match = pickArtistForUser({ id: "u-missing", name: "Nobody" }, [diego, maya]);
    assert.deepEqual(match, { artist: null, via: null });
  });

  it("does not steal a chair already linked to a different login via name", () => {
    const match = pickArtistForUser({ id: "u-other", name: "Diego Reyes" }, [diego, maya]);
    assert.deepEqual(match, { artist: null, via: null });
  });
});

describe("artistMatchHint", () => {
  it("explains userId vs name vs unmatched", () => {
    assert.match(artistMatchHint("userId", "Diego Reyes"), /linked login/);
    assert.match(artistMatchHint("name", "Diego Reyes"), /unique name match/);
    assert.match(artistMatchHint(null, null), /No roster chair/);
  });
});
