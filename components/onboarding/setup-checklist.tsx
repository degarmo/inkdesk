import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { ChecklistItem } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupChecklist({
  items,
  title = "What is left",
  description = "Finish these when you are ready. None of them block the floor.",
}: {
  items: ChecklistItem[];
  title?: string;
  description?: string;
}) {
  const remaining = items.filter((item) => !item.done);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {remaining.length === 0 ? (
          <p className="text-sm text-olive">Roster, book, and payments look set for this parlor.</p>
        ) : (
          <ul className="grid gap-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                {item.done ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className={item.done ? "text-sm text-muted line-through" : "text-sm font-medium text-ink"}>
                    {item.label}
                  </p>
                  <p className="text-sm text-muted">{item.detail}</p>
                </div>
                {item.done ? null : (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={item.href}>Open</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
