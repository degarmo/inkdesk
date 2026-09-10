import { CreditCard, Store, Wallet } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";
import type { EarningsPeriods } from "@/lib/earnings";
import { formatUsageFeePercent } from "@/lib/usage-fee";
import { formatMoney } from "@/lib/utils";

export function UsageFeeMoneySection({
  title,
  intro,
  percent,
  periods,
  columns,
}: {
  title: string;
  intro: string;
  percent: number;
  periods: EarningsPeriods;
  columns: { gross: string; fee: string; net: string };
}) {
  const rows = [periods.day, periods.week, periods.month, periods.year, periods.all];

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={CreditCard}
          label={`${columns.gross} (this month)`}
          value={formatMoney(periods.month.grossCents)}
          hint={`${formatMoney(periods.all.grossCents)} all time · ${formatMoney(periods.week.grossCents)} this week`}
        />
        <MetricCard
          icon={Store}
          label={`${columns.fee} (this month)`}
          value={formatMoney(periods.month.usageFeeCents)}
          hint={`${formatUsageFeePercent(percent)} taken from artist earnings for space and products — not Inkdesk billing`}
        />
        <MetricCard
          icon={Wallet}
          label={`${columns.net} (this month)`}
          value={formatMoney(periods.month.netCents)}
          hint={`${formatMoney(periods.all.netCents)} all time · ${formatMoney(periods.week.netCents)} this week`}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{intro}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Period</th>
                  <th className="py-2 pr-3 font-medium">{columns.gross}</th>
                  <th className="py-2 pr-3 font-medium">{columns.fee}</th>
                  <th className="py-2 font-medium">{columns.net}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-line last:border-0">
                    <td className="py-3 pr-3 font-medium text-ink">{row.label}</td>
                    <td className="py-3 pr-3">{formatMoney(row.grossCents)}</td>
                    <td className="py-3 pr-3">{formatMoney(row.usageFeeCents)}</td>
                    <td className="py-3">{formatMoney(row.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function StaffEarningsEmpty({ percent }: { percent: number }) {
  return (
    <EmptyState
      title="Your earnings will show here"
      body={`This login is not tied to a roster artist yet. When it is, you will see your gross, the parlor’s ${formatUsageFeePercent(percent)} usage fee taken from that gross, and your net. That fee is for space and products — not Inkdesk billing.`}
    />
  );
}
