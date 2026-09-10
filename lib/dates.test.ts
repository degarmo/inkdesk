import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calendarPeriodBounds, calendarPeriodStarts, dayBounds, dayKeyInZone, groupByShopDay } from "./dates";

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

describe("groupByShopDay", () => {
  it("splits UTC instants onto shop-local calendar days", () => {
    const tz = "America/Los_Angeles";
    // 18:30 PDT on Sep 10, 2026
    const lateAfternoon = new Date("2026-09-11T01:30:00.000Z");
    // 01:00 PDT on Sep 11, 2026
    const nextMorning = new Date("2026-09-11T08:00:00.000Z");
    const groups = groupByShopDay([{ startAt: lateAfternoon }, { startAt: nextMorning }], tz);

    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.dayKey, "2026-09-10");
    assert.equal(groups[0]?.items.length, 1);
    assert.equal(groups[1]?.dayKey, "2026-09-11");
    assert.equal(groups[1]?.items.length, 1);
  });

  it("keeps same-day bookings in one group, in order", () => {
    const tz = "America/New_York";
    const first = new Date("2026-09-10T15:00:00.000Z");
    const second = new Date("2026-09-10T19:00:00.000Z");
    const groups = groupByShopDay([{ startAt: first }, { startAt: second }], tz);

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.dayKey, "2026-09-10");
    assert.deepEqual(
      groups[0]?.items.map((item) => item.startAt),
      [first, second],
    );
  });
});

describe("dayBounds", () => {
  it("covers the shop-local day so today and upcoming do not overlap", () => {
    const tz = "America/Los_Angeles";
    const { start, end } = dayBounds("2026-09-10", tz);
    const justAfter = new Date(end.getTime() + 1);

    assert.equal(dayKeyInZone(start, tz), "2026-09-10");
    assert.equal(dayKeyInZone(end, tz), "2026-09-10");
    assert.equal(dayKeyInZone(justAfter, tz), "2026-09-11");
  });
});

describe("calendarPeriodBounds", () => {
  it("uses shop-local today, Sunday week start, month, and year", () => {
    const tz = "America/Los_Angeles";
    // Thursday 2:00 AM PDT on Sep 10, 2026
    const now = new Date("2026-09-10T09:00:00.000Z");
    const periods = calendarPeriodBounds(tz, now);

    assert.equal(dayKeyInZone(periods.day.start, tz), "2026-09-10");
    assert.equal(dayKeyInZone(periods.week.start, tz), "2026-09-06");
    assert.equal(dayKeyInZone(periods.month.start, tz), "2026-09-01");
    assert.equal(dayKeyInZone(periods.year.start, tz), "2026-01-01");
    assert.equal(dayKeyInZone(periods.day.end, tz), "2026-09-10");
  });
});
