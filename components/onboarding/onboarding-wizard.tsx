"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  Banknote,
  Check,
  CreditCard,
  Mail,
  UserPlus,
} from "lucide-react";
import {
  addOnboardingArtist,
  addOnboardingClient,
  addOwnerAsArtist,
  completeOnboarding,
  continueOnboardingArtist,
  inviteOnboardingUser,
  saveOnboardingProfile,
  saveOnboardingStripe,
  skipOnboardingClient,
  skipOnboardingPayments,
  skipOnboardingTeam,
  skipOnboardingToEnd,
} from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatedLoginCredentials } from "@/components/forms/created-login-credentials";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";
import { TIMEZONES } from "@/lib/constants";
import type { ChecklistItem } from "@/lib/onboarding";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { useOnceSubmit } from "@/lib/use-once-submit";
import { roleLabel } from "@/lib/utils";

type WizardShop = {
  name: string;
  timezone: string;
  hoursOpen: string;
  hoursClose: string;
  hasStripeKeys: boolean;
};

type WizardArtist = { id: string; name: string; specialty: string };
type WizardUser = { id: string; name: string; email: string; role: string };
type WizardClient = { id: string; name: string };

export function OnboardingWizard({
  shop,
  ownerName,
  step,
  furthest,
  completed,
  artists,
  users,
  clients,
  checklist,
  webhookUrl,
}: {
  shop: WizardShop;
  ownerName: string;
  step: number;
  furthest: number;
  completed: boolean;
  artists: WizardArtist[];
  users: WizardUser[];
  clients: WizardClient[];
  checklist: ChecklistItem[];
  webhookUrl: string;
}) {
  const current = ONBOARDING_STEPS.find((item) => item.id === step) ?? ONBOARDING_STEPS[0];

  return (
    <div className="grid gap-8">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ONBOARDING_STEPS.map((item) => {
          const reachable = completed || item.id <= furthest;
          const active = item.id === step;
          const done = item.id < furthest || (completed && item.id <= 6);
          const inner = (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                {done && !active ? <Check className="h-3.5 w-3.5" /> : item.id}
              </span>
              <span>
                {item.title}
                {item.optional ? <span className="block text-[10px] uppercase tracking-wide opacity-70">Optional</span> : null}
              </span>
            </>
          );
          const className = [
            "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs leading-4",
            active ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink",
            !reachable ? "cursor-not-allowed opacity-50" : "hover:border-ink/40",
          ].join(" ");
          return (
            <li key={item.id}>
              {reachable ? (
                <Link href={`/onboarding?step=${item.id}`} className={className}>
                  {inner}
                </Link>
              ) : (
                <span className={className}>{inner}</span>
              )}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              Step {current.id} of {ONBOARDING_STEPS.length}
            </p>
            <CardTitle className="mt-1">{current.title}</CardTitle>
            <CardDescription className="mt-1">
              {current.id === 1
                ? "Confirm the name and clock this parlor will use on the floor."
                : current.id === 2
                  ? "Bookings need at least one artist. You can add more later."
                  : current.id === 3
                    ? "Create a staff or admin login. Invite email is not sent yet."
                    : current.id === 4
                      ? "Cash still works. Stripe is only for card deposits on this parlor’s own account."
                      : current.id === 5
                        ? "Optional — add one client now or skip and do it from the book."
                        : "Setup is marked complete after you open the floor."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          {step === 1 ? <ProfileStep shop={shop} /> : null}
          {step === 2 ? <ArtistStep ownerName={ownerName} artists={artists} /> : null}
          {step === 3 ? <TeamStep users={users} /> : null}
          {step === 4 ? <PaymentsStep shop={shop} webhookUrl={webhookUrl} /> : null}
          {step === 5 ? <ClientStep clients={clients} /> : null}
          {step === 6 ? <DoneStep checklist={checklist} /> : null}

          {step < 6 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-sm text-muted">
                You can leave and come back. Refresh resumes this step.
              </p>
              <form action={skipOnboardingToEnd}>
                <Button type="submit" variant="ghost">
                  Skip remaining and open the floor
                </Button>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileStep({ shop }: { shop: WizardShop }) {
  const [state, action, pending] = useActionState(saveOnboardingProfile, null);
  const { onSubmit, unlock } = useOnceSubmit();
  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} className="grid gap-4" onSubmit={onSubmit}>
      <FormMessage error={state?.error} />
      <Field>
        <Label htmlFor="onb-name">Shop name</Label>
        <Input id="onb-name" name="name" required defaultValue={shop.name} />
      </Field>
      <Field>
        <Label htmlFor="onb-timezone">Timezone</Label>
        <NativeSelect id="onb-timezone" name="timezone" defaultValue={shop.timezone}>
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="onb-open">Opens</Label>
          <Input id="onb-open" name="hoursOpen" type="time" defaultValue={shop.hoursOpen} />
        </Field>
        <Field>
          <Label htmlFor="onb-close">Closes</Label>
          <Input id="onb-close" name="hoursClose" type="time" defaultValue={shop.hoursClose} />
        </Field>
      </div>
      <p className="text-sm text-muted">
        Hours are a shop-floor reminder for now. Day-by-day schedules and online booking come later.
      </p>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save and continue"}
        </Button>
      </div>
    </form>
  );
}

function ArtistStep({ ownerName, artists }: { ownerName: string; artists: WizardArtist[] }) {
  const [state, action, pending] = useActionState(addOnboardingArtist, null);
  const [continueState, continueAction, continuePending] = useActionState(continueOnboardingArtist, null);
  const { onSubmit, unlock } = useOnceSubmit();
  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <div className="grid gap-5">
      {artists.length > 0 ? (
        <div className="rounded-md border border-line bg-paper px-3 py-3">
          <p className="text-sm font-medium text-ink">Already on the roster</p>
          <ul className="mt-2 grid gap-1 text-sm text-muted">
            {artists.map((artist) => (
              <li key={artist.id}>
                {artist.name}
                {artist.specialty ? ` · ${artist.specialty}` : ""}
              </li>
            ))}
          </ul>
          <form action={continueAction} className="mt-3">
            <FormMessage error={continueState?.error} />
            <Button type="submit" variant="outline" disabled={continuePending} aria-busy={continuePending}>
              Continue with this roster
            </Button>
          </form>
        </div>
      ) : null}

      <form action={addOwnerAsArtist}>
        <Button type="submit" variant={artists.length ? "ghost" : "outline"}>
          <UserPlus className="h-4 w-4" />
          I&apos;m the only artist — add {ownerName}
        </Button>
      </form>

      <form action={action} className="grid gap-4" onSubmit={onSubmit}>
        <FormMessage error={state?.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="onb-artist-name">Artist name</Label>
            <Input id="onb-artist-name" name="name" required placeholder="Name on the chair" />
          </Field>
          <Field>
            <Label htmlFor="onb-artist-specialty">Specialty</Label>
            <Input id="onb-artist-specialty" name="specialty" placeholder="Fine line, traditional…" />
          </Field>
        </div>
        <input type="hidden" name="active" value="on" />
        <div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Adding…" : "Add artist and continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function TeamStep({ users }: { users: WizardUser[] }) {
  const [state, action, pending] = useActionState(inviteOnboardingUser, null);
  const { onSubmit, unlock } = useOnceSubmit();
  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <div className="grid gap-5">
      <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-muted">
        <Mail className="mb-0.5 mr-1 inline h-4 w-4" />
        Invite email is not wired. Creating a login generates credentials on this screen. Share them
        yourself — Inkdesk will not send the message.
      </p>

      {users.length > 1 ? (
        <div>
          <p className="text-sm font-medium text-ink">Logins on this shop</p>
          <ul className="mt-2 grid gap-1 text-sm text-muted">
            {users.map((user) => (
              <li key={user.id}>
                {user.name} · {user.email} · {roleLabel(user.role)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state?.password && state.email ? (
        <CreatedLoginCredentials
          state={state}
          footer={
            <form action={skipOnboardingTeam}>
              <Button type="submit" size="sm">
                Continue
              </Button>
            </form>
          }
        />
      ) : null}

      <form action={action} className="grid gap-4" autoComplete="off" onSubmit={onSubmit}>
        <FormMessage error={state?.error} success={state?.password ? undefined : state?.success} />
        <Field>
          <Label htmlFor="onb-user-name">Name</Label>
          <Input id="onb-user-name" name="name" required autoComplete="off" />
        </Field>
        <Field>
          <Label htmlFor="onb-user-email">Email they will sign in with</Label>
          <Input id="onb-user-email" name="email" type="email" required autoComplete="off" />
        </Field>
        <Field>
          <Label htmlFor="onb-user-password">Temporary password (optional)</Label>
          <Input
            id="onb-user-password"
            name="password"
            type="text"
            minLength={8}
            autoComplete="new-password"
            placeholder="Leave blank to generate one"
          />
        </Field>
        <Field>
          <Label htmlFor="onb-user-role">Role</Label>
          <NativeSelect id="onb-user-role" name="role" defaultValue="staff">
            <option value="staff">Staff — floor only</option>
            <option value="admin">Admin — floor plus parlor admin</option>
          </NativeSelect>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Creating…" : "Create login"}
          </Button>
        </div>
      </form>

      <form action={skipOnboardingTeam}>
        <Button type="submit" variant="outline">
          Skip for now
        </Button>
      </form>
    </div>
  );
}

function PaymentsStep({ shop, webhookUrl }: { shop: WizardShop; webhookUrl: string }) {
  const [state, action, pending] = useActionState(saveOnboardingStripe, null);
  const { onSubmit, unlock } = useOnceSubmit();
  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-paper px-3 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Banknote className="h-4 w-4" />
            Cash on the floor
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Mark deposits paid by hand. You do not need Stripe keys. Most parlors can skip this step
            and take cash or Venmo outside Inkdesk.
          </p>
        </div>
        <div className="rounded-md border border-line bg-paper px-3 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <CreditCard className="h-4 w-4" />
            Stripe client deposits
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Each parlor pastes its own Stripe keys. Checkout uses that shop&apos;s secret key — not a
            shared Inkdesk account. Platform billing and Connect are not built yet.
          </p>
        </div>
      </div>

      <p className="rounded-md border border-line bg-paper px-3 py-3 text-sm leading-6 text-muted">
        Financial information you enter in this app stays in this app. It is not shared
        outside Inkdesk. Reporting income for taxes is the parlor&apos;s job.
      </p>

      <p className="text-sm text-muted">
        Platform SaaS billing, Stripe Connect, and application fees are{" "}
        <span className="text-ink">not in this release</span>. See the README section
        &quot;Platform billing — next&quot;.
      </p>

      {shop.hasStripeKeys ? (
        <p className="text-sm text-olive">This parlor already has Stripe keys saved.</p>
      ) : null}

      <p className="text-sm text-muted">
        Prefer the full form?{" "}
        <Link href="/admin/settings" className="text-ink underline underline-offset-4">
          Paste keys in parlor settings
        </Link>{" "}
        and come back here.
      </p>

      <form action={action} className="grid gap-4" autoComplete="off" onSubmit={onSubmit}>
        <FormMessage error={state?.error} />
        <Field>
          <Label htmlFor="onb-pk">Publishable key</Label>
          <Input id="onb-pk" name="stripePublishableKey" autoComplete="off" placeholder="pk_test_…" />
        </Field>
        <Field>
          <Label htmlFor="onb-sk">Secret key</Label>
          <Input
            id="onb-sk"
            name="stripeSecretKey"
            type="password"
            autoComplete="new-password"
            placeholder="sk_test_…"
          />
        </Field>
        <Field>
          <Label htmlFor="onb-wh">Webhook signing secret (optional)</Label>
          <Input
            id="onb-wh"
            name="stripeWebhookSecret"
            type="password"
            autoComplete="new-password"
            placeholder="whsec_…"
          />
        </Field>
        <p className="text-xs leading-5 text-muted">
          Webhook URL for this shop: <span className="break-all font-mono text-ink">{webhookUrl}</span>
        </p>
        <div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : "Save keys and continue"}
          </Button>
        </div>
      </form>

      <form action={skipOnboardingPayments}>
        <Button type="submit" variant="outline">
          We mostly take cash — skip
        </Button>
      </form>
    </div>
  );
}

function ClientStep({ clients }: { clients: WizardClient[] }) {
  const [state, action, pending] = useActionState(addOnboardingClient, null);
  const { onSubmit, unlock } = useOnceSubmit();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <div className="grid gap-5">
      {clients.length > 0 ? (
        <p className="text-sm text-muted">
          {clients.length} client{clients.length === 1 ? "" : "s"} already in the book. You can skip
          or add another.
        </p>
      ) : null}

      <form action={action} className="grid gap-4" autoComplete="off" onSubmit={onSubmit}>
        <FormMessage error={state?.error} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <Field>
          <Label htmlFor="onb-client-name">Client name</Label>
          <Input id="onb-client-name" name="name" required autoComplete="off" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="onb-client-phone">Phone</Label>
            <Input id="onb-client-phone" name="phone" autoComplete="off" />
          </Field>
          <Field>
            <Label htmlFor="onb-client-email">Email</Label>
            <Input id="onb-client-email" name="email" type="email" autoComplete="off" />
          </Field>
        </div>
        <div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Adding…" : "Add client and continue"}
          </Button>
        </div>
      </form>

      <form action={skipOnboardingClient}>
        <Button type="submit" variant="outline">
          Skip for now
        </Button>
      </form>
    </div>
  );
}

function DoneStep({ checklist }: { checklist: ChecklistItem[] }) {
  return (
    <div className="grid gap-5">
      <p className="text-sm leading-6 text-muted">
        Marking setup complete opens the dashboard. You can re-open this guide from Settings anytime.
      </p>
      <SetupChecklist
        items={checklist}
        title="Still open after you land"
        description="These are leftovers, not blockers. Cash-only shops can ignore Stripe."
      />
      <form action={completeOnboarding}>
        <Button type="submit">Open the floor</Button>
      </form>
    </div>
  );
}
