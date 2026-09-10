import { addDays, format, parseISO, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export type CalendarPeriod = "day" | "week" | "month" | "year";

export function shopNow(timeZone: string) {
  return toZonedTime(new Date(), timeZone);
}

export function shopTodayKey(timeZone: string) {
  return formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
}

export function dayKeyInZone(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function formatShopDate(date: Date, timeZone: string, pattern = "EEE, MMM d") {
  return formatInTimeZone(date, timeZone, pattern);
}

export function formatShopTime(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "h:mm a");
}

export function formatShopDateTime(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "EEE, MMM d · h:mm a");
}

export function zonedDateTime(dayKey: string, time: string, timeZone: string) {
  return fromZonedTime(`${dayKey}T${time}:00`, timeZone);
}

export function dayBounds(dayKey: string, timeZone: string) {
  const start = fromZonedTime(`${dayKey}T00:00:00`, timeZone);
  const end = fromZonedTime(`${dayKey}T23:59:59.999`, timeZone);
  return { start, end };
}

export function weekDays(anchorKey: string) {
  const anchor = startOfDay(parseISO(anchorKey));
  return Array.from({ length: 7 }, (_, i) => format(addDays(anchor, i), "yyyy-MM-dd"));
}

export function addDayKey(dayKey: string, amount: number) {
  return format(addDays(parseISO(dayKey), amount), "yyyy-MM-dd");
}

export function timeValueInZone(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "HH:mm");
}

export type CalendarPeriodRange = {
  key: CalendarPeriod;
  label: string;
  start: Date;
  end: Date;
};

/** Shop-local today, this week (Sunday–Saturday), this month, and this year, all ending now. */
export function calendarPeriodBounds(timeZone: string, now = new Date()): Record<CalendarPeriod, CalendarPeriodRange> {
  const todayKey = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const zoned = toZonedTime(now, timeZone);
  const end = dayBounds(todayKey, timeZone).end;

  const weekStartKey = format(startOfWeek(zoned, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const monthStartKey = format(startOfMonth(zoned), "yyyy-MM-dd");
  const yearStartKey = format(startOfYear(zoned), "yyyy-MM-dd");

  return {
    day: { key: "day", label: "Today", start: dayBounds(todayKey, timeZone).start, end },
    week: { key: "week", label: "This week", start: dayBounds(weekStartKey, timeZone).start, end },
    month: { key: "month", label: "This month", start: dayBounds(monthStartKey, timeZone).start, end },
    year: { key: "year", label: "This year", start: dayBounds(yearStartKey, timeZone).start, end },
  };
}

/**
 * Inclusive starts for shop-local calendar windows (Sunday-start week).
 * Payments with createdAt >= start count in that window through now.
 */
export function calendarPeriodStarts(now: Date, timeZone: string) {
  const zoned = toZonedTime(now, timeZone);
  const dayKey = format(zoned, "yyyy-MM-dd");
  const weekKey = format(startOfWeek(zoned, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const monthKey = format(startOfMonth(zoned), "yyyy-MM-dd");
  const yearKey = format(startOfYear(zoned), "yyyy-MM-dd");
  return {
    day: fromZonedTime(`${dayKey}T00:00:00`, timeZone),
    week: fromZonedTime(`${weekKey}T00:00:00`, timeZone),
    month: fromZonedTime(`${monthKey}T00:00:00`, timeZone),
    year: fromZonedTime(`${yearKey}T00:00:00`, timeZone),
  };
}

/** Group already-ordered items by shop-local calendar day, preserving startAt order. */
export function groupByShopDay<T extends { startAt: Date }>(items: T[], timeZone: string) {
  const groups: { dayKey: string; items: T[] }[] = [];
  for (const item of items) {
    const dayKey = dayKeyInZone(item.startAt, timeZone);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.items.push(item);
    } else {
      groups.push({ dayKey, items: [item] });
    }
  }
  return groups;
}
