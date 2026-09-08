"use client";

import { markDepositPaid } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { useOnceSubmit } from "@/lib/use-once-submit";

export function DepositButton({ appointmentId }: { appointmentId: string }) {
  const submit = useOnceSubmit();
  return (
    <form action={markDepositPaid.bind(null, appointmentId)} onSubmit={submit.onSubmit}>
      <Button type="submit" size="sm" variant="outline">
        Mark deposit paid
      </Button>
    </form>
  );
}
