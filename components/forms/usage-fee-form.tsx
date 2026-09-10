"use client";

import { useActionState, useEffect } from "react";
import { updateUsageFee } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnceSubmit } from "@/lib/use-once-submit";
import {
  USAGE_FEE_HELP,
  USAGE_FEE_MAX,
  USAGE_FEE_MIN,
  USAGE_FEE_STAFF_NOTE,
  formatUsageFeePercent,
  usageFeePercentInput,
} from "@/lib/usage-fee";

export function UsageFeeForm({
  usageFeePercent,
  canEdit,
  redirectTo,
}: {
  usageFeePercent: number;
  canEdit: boolean;
  redirectTo?: string;
}) {
  const [state, action, pending] = useActionState(updateUsageFee, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  if (!canEdit) {
    return (
      <div className="grid gap-3">
        <p className="font-serif text-2xl text-ink">{formatUsageFeePercent(usageFeePercent)}</p>
        <p className="text-sm leading-6 text-muted">{USAGE_FEE_HELP}</p>
        <p className="text-sm leading-6 text-muted">{USAGE_FEE_STAFF_NOTE}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4" onSubmit={onSubmit}>
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <FormMessage error={state?.error} success={state?.success} />
      <Field>
        <Label htmlFor="usageFeePercent">Usage fee percent</Label>
        <div className="flex items-center gap-2">
          <Input
            id="usageFeePercent"
            name="usageFeePercent"
            type="number"
            min={USAGE_FEE_MIN}
            max={USAGE_FEE_MAX}
            step={0.1}
            inputMode="decimal"
            required
            defaultValue={usageFeePercentInput(usageFeePercent)}
            className="max-w-32"
            aria-describedby="usage-fee-help"
          />
          <span className="text-sm text-muted">%</span>
        </div>
      </Field>
      <p id="usage-fee-help" className="text-sm leading-6 text-muted">
        {USAGE_FEE_HELP} Applied to succeeded checkout amounts when we split shop vs artist money.
        Range is 0 to 100, with one decimal place if you need it.
      </p>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save usage fee"}
        </Button>
      </div>
    </form>
  );
}
