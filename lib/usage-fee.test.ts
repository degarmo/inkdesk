import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatUsageFeePercent,
  grossFeeNet,
  shopUsageTakeCents,
  splitGrossCents,
  usageFeePercentFromShop,
  usageFeePercentNumber,
} from "./usage-fee";

describe("usageFeePercentNumber", () => {
  it("reads numbers, numeric strings, and Decimal-like toNumber()", () => {
    assert.equal(usageFeePercentNumber(20), 20);
    assert.equal(usageFeePercentNumber("12.5"), 12.5);
    assert.equal(usageFeePercentNumber({ toNumber: () => 15 }), 15);
    assert.equal(usageFeePercentNumber("nope"), 0);
  });
});

describe("splitGrossCents", () => {
  it("takes a 20% parlor cut and leaves the rest for the artist", () => {
    assert.deepEqual(splitGrossCents(10_000, 20), {
      grossCents: 10_000,
      shopTakeCents: 2_000,
      artistShareCents: 8_000,
    });
  });

  it("supports one decimal place", () => {
    assert.equal(shopUsageTakeCents(8_000, 12.5), 1_000);
    assert.deepEqual(splitGrossCents(8_000, 12.5), {
      grossCents: 8_000,
      shopTakeCents: 1_000,
      artistShareCents: 7_000,
    });
  });

  it("rounds to whole cents and keeps shop take plus artist share equal to gross", () => {
    const split = splitGrossCents(333, 10);
    assert.equal(split.shopTakeCents, 33);
    assert.equal(split.shopTakeCents + split.artistShareCents, 333);
  });

  it("is a no-op at 0% and takes the full amount at 100%", () => {
    assert.deepEqual(splitGrossCents(5_000, 0), {
      grossCents: 5_000,
      shopTakeCents: 0,
      artistShareCents: 5_000,
    });
    assert.deepEqual(splitGrossCents(5_000, 100), {
      grossCents: 5_000,
      shopTakeCents: 5_000,
      artistShareCents: 0,
    });
  });
});

describe("grossFeeNet", () => {
  it("aliases shop take as fee and artist share as net", () => {
    assert.deepEqual(grossFeeNet(10_000, 20), {
      grossCents: 10_000,
      feeCents: 2_000,
      netCents: 8_000,
    });
  });
});

describe("usageFeePercentFromShop", () => {
  it("is 0 when the column is missing, otherwise the stored rate", () => {
    assert.equal(usageFeePercentFromShop({}), 0);
    assert.equal(usageFeePercentFromShop(null), 0);
    assert.equal(usageFeePercentFromShop({ usageFeePercent: 15 }), 15);
    assert.equal(usageFeePercentFromShop({ usageFeePercent: "12.5" }), 12.5);
  });
});

describe("formatUsageFeePercent", () => {
  it("drops a trailing .0", () => {
    assert.equal(formatUsageFeePercent(20), "20%");
    assert.equal(formatUsageFeePercent(12.5), "12.5%");
  });
});
