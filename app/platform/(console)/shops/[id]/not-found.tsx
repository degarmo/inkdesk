import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function PlatformShopNotFound() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Shop not found" description="That parlor is not on this instance." />
      <Button asChild variant="outline" className="w-fit">
        <Link href="/platform/shops">Back to shops</Link>
      </Button>
    </div>
  );
}
