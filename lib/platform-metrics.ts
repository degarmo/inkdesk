import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export function windowStart(days: number) {
  return subDays(new Date(), days);
}

function latest(dates: (Date | null | undefined)[]): Date | null {
  let best: Date | null = null;
  for (const value of dates) {
    if (value && (!best || value > best)) best = value;
  }
  return best;
}

export async function platformMetrics() {
  const now = new Date();
  const d7 = windowStart(7);
  const d30 = windowStart(30);

  const [
    shopCount,
    usersByRole,
    clientCount,
    bookingTotal,
    booking7,
    booking30,
    payments30,
    recentLogins,
    recentBookings,
  ] = await Promise.all([
    prisma.shop.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.client.count(),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { startAt: { gte: d7, lte: now } } }),
    prisma.appointment.count({ where: { startAt: { gte: d30, lte: now } } }),
    prisma.payment.aggregate({
      where: { status: "succeeded", createdAt: { gte: d30 } },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    prisma.user.groupBy({
      by: ["shopId"],
      where: { lastSeenAt: { gte: d30 } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["shopId"],
      where: { startAt: { gte: d30, lte: now } },
      _count: { _all: true },
    }),
  ]);

  const roleCounts = { owner: 0, admin: 0, staff: 0, other: 0 };
  let userTotal = 0;
  for (const row of usersByRole) {
    userTotal += row._count._all;
    if (row.role === "owner") roleCounts.owner = row._count._all;
    else if (row.role === "admin") roleCounts.admin = row._count._all;
    else if (row.role === "staff") roleCounts.staff = row._count._all;
    else roleCounts.other += row._count._all;
  }

  const activeIds = new Set<string>();
  for (const row of recentLogins) activeIds.add(row.shopId);
  for (const row of recentBookings) activeIds.add(row.shopId);

  return {
    now,
    shopCount,
    activeShops: activeIds.size,
    userTotal,
    roleCounts,
    clientCount,
    bookingTotal,
    booking7,
    booking30,
    payments30Count: payments30._count._all,
    payments30Cents: payments30._sum.amountCents ?? 0,
  };
}

/** Latest parlor login or past booking start — not row `updatedAt` (seed would fake activity). */
export async function shopActivityMap(shopIds: string[], now = new Date()) {
  const empty = new Map<string, Date | null>();
  if (shopIds.length === 0) return empty;

  const [users, pastBookings] = await Promise.all([
    prisma.user.findMany({
      where: { shopId: { in: shopIds } },
      select: { shopId: true, lastSeenAt: true },
    }),
    prisma.appointment.groupBy({
      by: ["shopId"],
      where: { shopId: { in: shopIds }, startAt: { lte: now } },
      _max: { startAt: true },
    }),
  ]);

  const lastSeen = new Map<string, Date>();
  for (const user of users) {
    if (!user.lastSeenAt) continue;
    const prev = lastSeen.get(user.shopId);
    if (!prev || user.lastSeenAt > prev) lastSeen.set(user.shopId, user.lastSeenAt);
  }

  const lastBooking = new Map(pastBookings.map((row) => [row.shopId, row._max.startAt]));
  const map = new Map<string, Date | null>();
  for (const id of shopIds) {
    map.set(id, latest([lastSeen.get(id), lastBooking.get(id)]));
  }
  return map;
}
