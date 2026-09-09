import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { reopenOnboarding } from "@/actions/onboarding";
import { requireShop, isAdminRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/forms/settings-form";
import { FlashNotice } from "@/components/flash-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { shop, session } = await requireShop();
  const { saved } = await searchParams;
  const canSetup = isAdminRole(session.role);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Settings"
        description="Shop identity and the clock the calendar uses."
      />

      {canSetup ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <div>
              <CardTitle>Setup guide</CardTitle>
              <CardDescription>
                {shop.onboardingCompletedAt
                  ? "Walk through shop profile, artists, team, payments, and a first client again."
                  : "This parlor is not marked complete. Finish or skip remaining steps to open the floor."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form action={reopenOnboarding}>
              <Button type="submit" variant="outline">
                <ListChecks className="h-4 w-4" />
                Open setup guide
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Shop</CardTitle>
          <CardDescription>These values apply to every booking in this account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <FlashNotice saved={saved} message="Shop settings saved." />
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
              Each parlor connects its own Stripe account under Admin → Settings. Checkout uses that shop&apos;s
              secret key — not a shared platform account. Until keys are saved, pay buttons read{" "}
              <span className="text-ink">Connect Stripe in Admin → Settings</span>.
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
