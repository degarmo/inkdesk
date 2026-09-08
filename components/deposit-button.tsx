import { markDepositPaid } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

export function DepositButton({ appointmentId }: { appointmentId: string }) {
  return (
    <form action={markDepositPaid.bind(null, appointmentId)}>
      <Button type="submit" size="sm" variant="outline">
        Mark deposit paid
      </Button>
    </form>
  );
}
