import type { Metadata } from "next";
import { requireShop } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/forms/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { shop } = await requireShop();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Settings"
        description="Shop identity and the clock the calendar uses."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Shop</CardTitle>
          <CardDescription>These values apply to every booking in this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaultValues={{
              name: shop.name,
              timezone: shop.timezone,
              hoursOpen: shop.hoursOpen,
              hoursClose: shop.hoursClose,
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Online booking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted">
              A public booking page is out of scope for this trial. When it lands, clients will pick
              an artist and an open slot without emailing the shop.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deposits via Stripe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted">
              Inkdesk records whether a deposit is paid. Card capture and receipts will hook in here
              later — no processor is connected yet.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SMS reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted">
              Reminder texts for tomorrow&apos;s chairs are a planned follow-up. For now, the day
              list on the dashboard is the source of truth.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
