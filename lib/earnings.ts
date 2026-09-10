import { prisma } from "@/lib/prisma";
import { calendarPeriodBounds } from "@/lib/dates";
import { splitGrossCents } from "@/lib/usage-fee";

export type EarningsSplit = {
  grossCents: number;
  usageFeeCents: number;
  netCents: number;
};

export type EarningsPeriodRow = EarningsSplit & {
  key: "day" | "week" | "month" | "year" | "all";
  label: string;
};

export type EarningsPeriods = {
  day: EarningsPeriodRow;
  week: EarningsPeriodRow;
  month: EarningsPeriodRow;
  year: EarningsPeriodRow;
  all: EarningsPeriodRow;
};

function asSplit(grossCents: number, usageFeePercent: number): EarningsSplit {
  const split = splitGrossCents(grossCents, usageFeePercent);
  return {
    grossCents: split.grossCents,
    usageFeeCents: split.shopTakeCents,
    netCents: split.artistShareCents,
  };
}

async function succeededGross(params: {
  shopId: string;
  artistId?: string;
  createdAt?: { gte: Date; lte: Date };
}) {
  const row = await prisma.payment.aggregate({
    where: {
      shopId: params.shopId,
      status: "succeeded",
      ...(params.createdAt ? { createdAt: params.createdAt } : {}),
      ...(params.artistId ? { appointment: { artistId: params.artistId } } : {}),
    },
    _sum: { amountCents: true },
  });
  return row._sum.amountCents ?? 0;
}

/** Succeeded checkout, split into gross / parlor usage fee / artist net. Artist-scoped when artistId is set. */
export async function loadEarningsPeriods(params: {
  shopId: string;
  artistId?: string;
  timeZone: string;
  usageFeePercent: number;
  now?: Date;
}): Promise<EarningsPeriods> {
  const periods = calendarPeriodBounds(params.timeZone, params.now);

  const [dayGross, weekGross, monthGross, yearGross, allGross] = await Promise.all([
    succeededGross({
      shopId: params.shopId,
      artistId: params.artistId,
      createdAt: { gte: periods.day.start, lte: periods.day.end },
    }),
    succeededGross({
      shopId: params.shopId,
      artistId: params.artistId,
      createdAt: { gte: periods.week.start, lte: periods.week.end },
    }),
    succeededGross({
      shopId: params.shopId,
      artistId: params.artistId,
      createdAt: { gte: periods.month.start, lte: periods.month.end },
    }),
    succeededGross({
      shopId: params.shopId,
      artistId: params.artistId,
      createdAt: { gte: periods.year.start, lte: periods.year.end },
    }),
    succeededGross({ shopId: params.shopId, artistId: params.artistId }),
  ]);

  const withSplit = (key: EarningsPeriodRow["key"], label: string, gross: number): EarningsPeriodRow => ({
    key,
    label,
    ...asSplit(gross, params.usageFeePercent),
  });

  return {
    day: withSplit("day", periods.day.label, dayGross),
    week: withSplit("week", periods.week.label, weekGross),
    month: withSplit("month", periods.month.label, monthGross),
    year: withSplit("year", periods.year.label, yearGross),
    all: withSplit("all", "All time", allGross),
  };
}
