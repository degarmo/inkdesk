import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/forms/client-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="New client"
        description="Walk-in or booked — get them in the book first."
        actions={
          <Button asChild variant="outline">
            <Link href="/clients">Back to clients</Link>
          </Button>
        }
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <ClientForm idempotencyKey={crypto.randomUUID()} />
        </CardContent>
      </Card>
    </div>
  );
}
