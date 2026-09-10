import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatShopDateTime } from "@/lib/dates";
import { roleLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { FlashNotice } from "@/components/flash-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateShopUserForm } from "@/components/forms/shop-user-form";
import { UserActiveForm, UserRoleForm } from "@/components/forms/shop-user-controls";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { shop, session } = await requireAdmin();
  const { saved } = await searchParams;
  const users = await prisma.user.findMany({
    where: { shopId: shop.id },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Users"
        description="Add a login for this parlor. Email must be unique across Inkdesk."
      />
      <FlashNotice saved={saved} message="User list updated." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Shop logins</CardTitle>
            <CardDescription>{users.length} accounts · keep at least one active owner</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {users.map((user) => (
                <li key={user.id} className="grid gap-3 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {user.name}
                        {user.id === session.id ? " (you)" : ""}
                      </p>
                      <p className="text-sm text-muted">{user.email}</p>
                      <p className="text-xs text-muted">{formatShopDateTime(user.createdAt, shop.timezone)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={user.active ? "olive" : "muted"}>{user.active ? "Active" : "Deactivated"}</Badge>
                      <Badge>{roleLabel(user.role)}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-3">
                    <UserRoleForm userId={user.id} role={user.role} />
                    <UserActiveForm userId={user.id} active={user.active} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add a login</CardTitle>
            <CardDescription>They sign in with this email and the password you set. Artists can also get a login from Artists → Add to the roster.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateShopUserForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
