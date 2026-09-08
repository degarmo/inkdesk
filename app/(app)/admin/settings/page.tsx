import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/forms/settings-form";
import { StripeSettingsForm } from "@/components/forms/stripe-settings-form";
import { FlashNotice } from "@/components/flash-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decryptSecret, maskSecret } from "@/lib/secrets";
import { requestOrigin, shopStripeCredentials, stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Parlor settings" };

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; stripe?: string }>;
}) {
  const { shop } = await requireAdmin();
  const flash = await searchParams;
  const origin = await requestOrigin();
  const creds = shopStripeCredentials(shop);
  const secretPlain = decryptSecret(shop.stripeSecretKey);
  const webhookPlain = decryptSecret(shop.stripeWebhookSecret);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Parlor settings"
        description="Identity for the floor, plus this shop’s own Stripe account. There is no shared Tally Two processor."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shop</CardTitle>
            <CardDescription>Name, timezone, and hours used on the calendar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <FlashNotice saved={flash.saved} message="Shop settings saved." />
            <SettingsForm
              defaultValues={{
                name: shop.name,
                timezone: shop.timezone,
                hoursOpen: shop.hoursOpen,
                hoursClose: shop.hoursClose,
              }}
              redirectTo="/admin/settings"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe</CardTitle>
            <CardDescription>
              Checkout and webhooks use keys stored on this parlor. Secrets are encrypted at rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <FlashNotice saved={flash.stripe} message="Stripe keys saved for this parlor." />
            <StripeSettingsForm
              publishableKey={shop.stripePublishableKey}
              secretMask={secretPlain ? maskSecret(secretPlain) : ""}
              webhookMask={webhookPlain ? maskSecret(webhookPlain) : ""}
              webhookUrl={`${origin}/api/stripe/webhook/${shop.id}`}
              connected={stripeConfigured(shop)}
              usingEnvFallback={creds?.source === "env"}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
