import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calendarPeriodStarts } from "./dates";

describe("calendarPeriodStarts", () => {
  it("uses shop-local midnight for day, Sunday week, month, and year", () => {
    // Thursday 10 Sep 2026 18:00 in Los Angeles.
    const now = new Date("2026-09-11T01:00:00.000Z");
    const starts = calendarPeriodStarts(now, "America/Los_Angeles");
    assert.equal(starts.day.toISOString(), "2026-09-10T07:00:00.000Z");
    assert.equal(starts.week.toISOString(), "2026-09-06T07:00:00.000Z");
    assert.equal(starts.month.toISOString(), "2026-09-01T07:00:00.000Z");
    assert.equal(starts.year.toISOString(), "2026-01-01T08:00:00.000Z");
  });
});
