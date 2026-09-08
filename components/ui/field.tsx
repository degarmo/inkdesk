import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5", className)} {...props} />;
}

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p className="rounded-md border border-oxblood/20 bg-oxblood/8 px-3 py-2 text-sm text-oxblood" role="alert">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="rounded-md border border-olive/20 bg-olive/8 px-3 py-2 text-sm text-olive" role="status">
        {success}
      </p>
    );
  }
  return null;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-surface/60 px-5 py-8">
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-muted">{body}</p>
      {action}
    </div>
  );
}
