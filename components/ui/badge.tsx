import { cn } from "@/lib/utils";

const tones = {
  default: "bg-paper text-ink border-line",
  rust: "bg-oxblood/10 text-oxblood border-oxblood/20",
  olive: "bg-olive/10 text-olive border-olive/20",
  muted: "bg-line/50 text-muted border-transparent",
  gold: "bg-amber-100 text-amber-900 border-amber-200",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
