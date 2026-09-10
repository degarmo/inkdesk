import { CalendarDays, Wallet } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { formatMoney } from "@/lib/utils";
import { formatUsageFeePercent } from "@/lib/usage-fee";
import type { EarningsWindows, PeriodEarnings } from "@/lib/shop-metrics";

function chain(period: PeriodEarnings) {
  return `${formatMoney(period.grossCents)} gross → ${formatMoney(period.feeCents)} usage fee → ${formatMoney(period.netCents)} net`;
}

function hint(period: PeriodEarnings) {
  const count =
    period.count === 0 ? "No succeeded Checkout in this window" : `${period.count} succeeded`;
  return `${chain(period)} · ${count}`;
}

export function EarningsWindowCards({ windows }: { windows: EarningsWindows }) {
  const rate = formatUsageFeePercent(windows.usageFeePercent);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Big number is your net after the parlor usage fee ({rate}). Gross is succeeded Checkout on
        your chair. Owner and admin still see shop-wide collected.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Wallet} label="Today" value={formatMoney(windows.day.netCents)} hint={hint(windows.day)} />
        <MetricCard
          icon={CalendarDays}
          label="This week"
          value={formatMoney(windows.week.netCents)}
          hint={hint(windows.week)}
        />
        <MetricCard
          icon={Wallet}
          label="This month"
          value={formatMoney(windows.month.netCents)}
          hint={hint(windows.month)}
        />
        <MetricCard
          icon={CalendarDays}
          label="This year"
          value={formatMoney(windows.year.netCents)}
          hint={hint(windows.year)}
        />
      </div>
    </div>
  );
}
