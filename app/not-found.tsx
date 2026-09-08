import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <p className="font-serif text-3xl text-ink">That page is not in the book.</p>
      <p className="text-sm text-muted">The link may be old, or the record belongs to another shop.</p>
      <Button asChild>
        <Link href="/dashboard">Back to the floor</Link>
      </Button>
    </div>
  );
}
