import type { Metadata } from "next";
import Link from "next/link";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatShopDate } from "@/lib/dates";
import { formatPhone, parseTags, tagLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Clients"
        description="The book of people who sit in the chair."
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
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Contact</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Tags</th>
                <th className="px-4 py-3 font-medium">Last visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-paper/70">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium text-ink">
                      {client.name}
                    </Link>
                    <p className="text-muted sm:hidden">{client.phone ? formatPhone(client.phone) : "—"}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    <p>{client.phone ? formatPhone(client.phone) : "—"}</p>
                    <p>{client.email || ""}</p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {parseTags(client.tags).map((tag) => (
                        <Badge key={tag}>{tagLabel(tag)}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {client.lastVisit ? formatShopDate(client.lastVisit, shop.timezone) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
