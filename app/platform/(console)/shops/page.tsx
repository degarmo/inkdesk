import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { shopActivityMap, windowStart } from "@/lib/platform-metrics";
import { prisma } from "@/lib/prisma";
import { formatShopDate } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/field";

export const metadata: Metadata = { title: "Shops" };

export default async function PlatformShopsPage() {
  await requirePlatformAdmin();
  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: { select: { users: true, appointments: true, clients: true } },
    },
  });
  const activity = await shopActivityMap(shops.map((shop) => shop.id));
  const activeCutoff = windowStart(30);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Shops"
        description={`${shops.length} parlors on this instance. Open a row for a read-only snapshot.`}
      />

      {shops.length === 0 ? (
        <EmptyState title="No shops" body="When someone signs up a parlor, it will land here." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-2">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="py-3 pr-3 font-medium">Shop</th>
                  <th className="py-3 pr-3 font-medium">Owner</th>
                  <th className="py-3 pr-3 font-medium">Users</th>
                  <th className="py-3 pr-3 font-medium">Bookings</th>
                  <th className="py-3 pr-3 font-medium">Last activity</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => {
                  const owner = shop.users.find((user) => user.role === "owner" && user.active) ?? shop.users[0];
                  const last = activity.get(shop.id);
                  const isActive = last ? last >= activeCutoff : false;
                  return (
                    <tr key={shop.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-3">
                        <Link href={`/platform/shops/${shop.id}`} className="font-medium text-ink hover:underline">
                          {shop.name}
                        </Link>
                        <p className="text-xs text-muted">
                          Created {formatShopDate(shop.createdAt, shop.timezone, "MMM d, yyyy")}
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-muted">{owner?.email ?? "No owner"}</td>
                      <td className="py-3 pr-3">{shop._count.users}</td>
                      <td className="py-3 pr-3">{shop._count.appointments}</td>
                      <td className="py-3 pr-3 text-muted">
                        {last ? formatShopDate(last, shop.timezone, "MMM d, yyyy") : "Never"}
                      </td>
                      <td className="py-3">
                        <Badge tone={isActive ? "olive" : "muted"}>{isActive ? "Active" : "Quiet"}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
