"use client";

import { useActionState, useEffect } from "react";
import { updateStripeSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnceSubmit } from "@/lib/use-once-submit";

export function StripeSettingsForm({
  publishableKey,
  secretMask,
  webhookMask,
  webhookUrl,
  connected,
  usingEnvFallback,
}: {
  publishableKey: string;
  secretMask: string;
  webhookMask: string;
  webhookUrl: string;
  connected: boolean;
  usingEnvFallback: boolean;
}) {
  const [state, action, pending] = useActionState(updateStripeSettings, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} className="grid gap-4" autoComplete="off" onSubmit={onSubmit}>
      <FormMessage error={state?.error} success={state?.success} />
      {usingEnvFallback ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          No keys are saved on this parlor. A local <code className="font-mono text-xs">.env</code> fallback
          is active for development only. Paste this shop&apos;s Stripe keys here for the real path.
        </p>
      ) : null}
      {!connected ? (
        <p className="text-sm text-muted">
          Each parlor uses its own Stripe account. Nothing is charged until you save a secret key for this shop.
        </p>
      ) : (
        <p className="text-sm text-olive">Checkout will use this parlor&apos;s secret key — not a shared platform account.</p>
      )}
      <Field>
        <Label htmlFor="stripePublishableKey">Publishable key</Label>
        <Input
          id="stripePublishableKey"
          name="stripePublishableKey"
          autoComplete="off"
          placeholder={publishableKey || "pk_test_…"}
          defaultValue={publishableKey}
        />
      </Field>
      <Field>
        <Label htmlFor="stripeSecretKey">Secret key</Label>
        <Input
          id="stripeSecretKey"
          name="stripeSecretKey"
          type="password"
          autoComplete="new-password"
          placeholder={secretMask || "sk_test_…"}
        />
        <p className="text-xs text-muted">
          {secretMask ? `Saved: ${secretMask}. Leave blank to keep it.` : "Encrypted at rest. Leave blank if you are only updating another field."}
        </p>
      </Field>
      <Field>
        <Label htmlFor="stripeWebhookSecret">Webhook signing secret</Label>
        <Input
          id="stripeWebhookSecret"
          name="stripeWebhookSecret"
          type="password"
          autoComplete="new-password"
          placeholder={webhookMask || "whsec_…"}
        />
        <p className="text-xs text-muted">
          {webhookMask ? `Saved: ${webhookMask}. Leave blank to keep it.` : "From this parlor’s Stripe Dashboard → Webhooks."}
        </p>
      </Field>
      <div className="rounded-md border border-line bg-paper px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Webhook endpoint</p>
        <p className="mt-1 break-all font-mono text-xs text-ink">{webhookUrl}</p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Paste this URL on the parlor&apos;s Stripe account. Events include <code>metadata.shopId</code>.
          The signing secret above verifies the payload for this shop only.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="clearStripe" className="h-4 w-4 rounded border-line" />
        Remove saved Stripe keys from this parlor
      </label>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save Stripe keys"}
        </Button>
      </div>
    </form>
  );
}
