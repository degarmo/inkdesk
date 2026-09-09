import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-serif text-3xl text-ink">{value}</p>
        {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function RatioBar({
  label,
  value,
  max,
  right,
}: {
  label: string;
  value: number;
  max: number;
  right: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-muted">{right}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-2 rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
