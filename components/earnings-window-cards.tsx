import { CalendarDays, Wallet } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { formatMoney } from "@/lib/utils";
import type { EarningsWindows } from "@/lib/shop-metrics";

export function EarningsWindowCards({
  windows,
  emptyHint,
}: {
  windows: EarningsWindows;
  emptyHint?: string;
}) {
  const hint = (count: number) =>
    count === 0 ? emptyHint ?? "No succeeded Checkout in this window" : `${count} succeeded`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard icon={Wallet} label="Today" value={formatMoney(windows.dayCents)} hint={hint(windows.dayCount)} />
      <MetricCard
        icon={CalendarDays}
        label="This week"
        value={formatMoney(windows.weekCents)}
        hint={hint(windows.weekCount)}
      />
      <MetricCard
        icon={Wallet}
        label="This month"
        value={formatMoney(windows.monthCents)}
        hint={hint(windows.monthCount)}
      />
      <MetricCard
        icon={CalendarDays}
        label="This year"
        value={formatMoney(windows.yearCents)}
        hint={hint(windows.yearCount)}
      />
    </div>
  );
}
