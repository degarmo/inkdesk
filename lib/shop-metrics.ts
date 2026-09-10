import { addDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { APPOINTMENT_STATUSES, SERVICE_TYPES } from "@/lib/constants";
import { splitGrossCents, usageFeePercentNumber } from "@/lib/usage-fee";

const OPEN_DEPOSIT_STATUSES = ["scheduled", "completed"];

export type ArtistRow = {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
  bookings: number;
  completed: number;
  estimatedCents: number;
  estimatedShopTakeCents: number;
  estimatedArtistShareCents: number;
  collectedCents: number;
  shopTakeCents: number;
  artistShareCents: number;
};

export async function shopAnalytics(shopId: string) {
  const now = new Date();
  const d7 = subDays(now, 7);
  const d30 = subDays(now, 30);
  const weekEnd = addDays(now, 7);

  const [
    revenueAll,
    revenue7,
    revenue30,
    unpaidDeposits,
    statusRows,
    clientTotal,
    clients7,
    clients30,
    upcoming,
    serviceRows,
    artists,
    depositUniverse,
    shopRow,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { shopId, status: "succeeded" },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { shopId, status: "succeeded", createdAt: { gte: d7 } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { shopId, status: "succeeded", createdAt: { gte: d30 } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.appointment.aggregate({
      where: {
        shopId,
        depositPaid: false,
        depositCents: { gt: 0 },
        status: { in: OPEN_DEPOSIT_STATUSES },
      },
      _sum: { depositCents: true },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { shopId },
      _count: { _all: true },
    }),
    prisma.client.count({ where: { shopId } }),
    prisma.client.count({ where: { shopId, createdAt: { gte: d7 } } }),
    prisma.client.count({ where: { shopId, createdAt: { gte: d30 } } }),
    prisma.appointment.count({
      where: { shopId, startAt: { gte: now, lte: weekEnd }, status: "scheduled" },
    }),
    prisma.appointment.groupBy({
      by: ["serviceType"],
      where: { shopId },
      _count: { _all: true },
    }),
    prisma.artist.findMany({
      where: { shopId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        appointments: {
          select: {
            status: true,
            depositCents: true,
            payments: { where: { status: "succeeded" }, select: { amountCents: true } },
          },
        },
      },
    }),
    prisma.appointment.aggregate({
      where: { shopId, depositCents: { gt: 0 } },
      _count: { _all: true },
    }),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { usageFeePercent: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const item of APPOINTMENT_STATUSES) statusCounts[item.value] = 0;
  let bookingTotal = 0;
  for (const row of statusRows) {
    bookingTotal += row._count._all;
    statusCounts[row.status] = row._count._all;
  }

  const paidDeposits = await prisma.appointment.count({
    where: { shopId, depositCents: { gt: 0 }, depositPaid: true },
  });
  const depositBooked = depositUniverse._count._all;
  const depositRate = depositBooked === 0 ? null : paidDeposits / depositBooked;
  const usageFeePercent = usageFeePercentNumber(shopRow?.usageFeePercent ?? 0);
  const revenueAllSplit = splitGrossCents(revenueAll._sum.amountCents ?? 0, usageFeePercent);
  const revenue7Split = splitGrossCents(revenue7._sum.amountCents ?? 0, usageFeePercent);
  const revenue30Split = splitGrossCents(revenue30._sum.amountCents ?? 0, usageFeePercent);

  const artistRows: ArtistRow[] = artists.map((artist) => {
    let bookings = 0;
    let completed = 0;
    let estimatedCents = 0;
    let collectedCents = 0;
    for (const appointment of artist.appointments) {
      bookings += 1;
      if (appointment.status === "completed") completed += 1;
      estimatedCents += appointment.depositCents;
      for (const payment of appointment.payments) collectedCents += payment.amountCents;
    }
    const collected = splitGrossCents(collectedCents, usageFeePercent);
    const estimated = splitGrossCents(estimatedCents, usageFeePercent);
    return {
      id: artist.id,
      name: artist.name,
      specialty: artist.specialty,
      active: artist.active,
      bookings,
      completed,
      estimatedCents: estimated.grossCents,
      estimatedShopTakeCents: estimated.shopTakeCents,
      estimatedArtistShareCents: estimated.artistShareCents,
      collectedCents: collected.grossCents,
      shopTakeCents: collected.shopTakeCents,
      artistShareCents: collected.artistShareCents,
    };
  });

  const topServices = serviceRows
    .map((row) => ({
      value: row.serviceType,
      label: SERVICE_TYPES.find((item) => item.value === row.serviceType)?.label ?? row.serviceType,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    now,
    usageFeePercent,
    revenueAllCents: revenueAllSplit.grossCents,
    shopTakeAllCents: revenueAllSplit.shopTakeCents,
    artistShareAllCents: revenueAllSplit.artistShareCents,
    revenueAllCount: revenueAll._count._all,
    revenue7Cents: revenue7Split.grossCents,
    shopTake7Cents: revenue7Split.shopTakeCents,
    artistShare7Cents: revenue7Split.artistShareCents,
    revenue7Count: revenue7._count._all,
    revenue30Cents: revenue30Split.grossCents,
    shopTake30Cents: revenue30Split.shopTakeCents,
    artistShare30Cents: revenue30Split.artistShareCents,
    revenue30Count: revenue30._count._all,
    unpaidDepositCents: unpaidDeposits._sum.depositCents ?? 0,
    unpaidDepositCount: unpaidDeposits._count._all,
    bookingTotal,
    statusCounts,
    clientTotal,
    clients7,
    clients30,
    upcomingWeek: upcoming,
    depositBooked,
    paidDeposits,
    depositRate,
    artistRows,
    topServices,
  };
}
