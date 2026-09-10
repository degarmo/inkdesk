"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { startCheckout } from "@/actions/payments";
import { DepositButton } from "@/components/deposit-button";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { STRIPE_NOT_CONFIGURED } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { useOnceSubmit } from "@/lib/use-once-submit";

function CheckoutButton({
  appointmentId,
  type,
  amountCents,
  label,
}: {
  appointmentId: string;
  type: "deposit" | "balance" | "other";
  amountCents: number;
  label: string;
}) {
  const [state, action, pending] = useActionState(startCheckout, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} onSubmit={onSubmit}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="amountCents" value={String(amountCents)} />
      <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
        {pending ? "Opening Stripe…" : label}
      </Button>
      {state?.error ? <p className="mt-1 text-xs text-oxblood">{state.error}</p> : null}
    </form>
  );
}

function BalanceForm({ appointmentId }: { appointmentId: string }) {
  const [state, action, pending] = useActionState(startCheckout, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="type" value="balance" />
      <Input
        name="amountDollars"
        type="number"
        min={0.5}
        step={0.01}
        required
        placeholder="Balance $"
        className="h-8 w-28 text-xs"
        aria-label="Balance amount in dollars"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending} aria-busy={pending}>
        {pending ? "Opening Stripe…" : "Pay balance"}
      </Button>
      <FormMessage error={state?.error} />
    </form>
  );
}

export function AppointmentPayActions({
  appointmentId,
  depositCents,
  depositPaid,
  stripeReady,
  isAdmin,
  compact = false,
}: {
  appointmentId: string;
  depositCents: number;
  depositPaid: boolean;
  stripeReady: boolean;
  isAdmin: boolean;
  compact?: boolean;
}) {
  const needsDeposit = !depositPaid && depositCents > 0;

  if (!stripeReady) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {isAdmin ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/settings">{STRIPE_NOT_CONFIGURED}</Link>
          </Button>
        ) : (
          <p className="text-xs text-muted">Card checkout is off until an owner connects Stripe.</p>
        )}
        {needsDeposit ? <DepositButton appointmentId={appointmentId} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {needsDeposit ? (
          <CheckoutButton
            appointmentId={appointmentId}
            type="deposit"
            amountCents={depositCents}
            label={`Pay ${formatMoney(depositCents)} deposit`}
          />
        ) : null}
        {!compact ? <BalanceForm appointmentId={appointmentId} /> : null}
        {needsDeposit ? <DepositButton appointmentId={appointmentId} /> : null}
      </div>
    </div>
  );
}
