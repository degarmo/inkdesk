import type { Metadata } from "next";
import Link from "next/link";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ClientList } from "@/components/client-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/field";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { shop } = await requireShop();
  const { q = "" } = await searchParams;
  const query = q.trim();

  const clients = await prisma.client.findMany({
    where: {
      shopId: shop.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { email: { contains: query } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: { appointments: { where: { shopId: shop.id } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Clients"
        description="The book of people who sit in the chair. Open a row for their card and every booking."
        actions={
          <Button asChild>
            <Link href="/clients/new">Add client</Link>
          </Button>
        }
      />

      <form className="flex flex-col gap-2 sm:flex-row" action="/clients">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search name, phone, or email"
          className="sm:max-w-md"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {clients.length === 0 ? (
        <EmptyState
          title={query ? "No clients match that search" : "No clients yet"}
          body={
            query
              ? "Try a different name or phone number."
              : "Add a walk-in or regular so you can book them against an artist."
          }
          action={
            <Button asChild>
              <Link href="/clients/new">Add client</Link>
            </Button>
          }
        />
      ) : (
        <ClientList clients={clients} timezone={shop.timezone} />
      )}
    </div>
  );
}
