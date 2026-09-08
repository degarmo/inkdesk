import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/utils";

const tones: Record<string, "olive" | "gold" | "muted" | "rust"> = {
  scheduled: "gold",
  completed: "olive",
  cancelled: "muted",
  "no-show": "rust",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={tones[status] ?? "default"}>{statusLabel(status)}</Badge>;
}
