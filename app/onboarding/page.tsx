import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";
import { logOut } from "@/actions/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Button } from "@/components/ui/button";
import { isAdminRole, requireShop } from "@/lib/auth";
import {
  buildSetupChecklist,
  parseStepParam,
  shopHasStripeKeys,
  viewOnboardingStep,
} from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requestOrigin } from "@/lib/stripe";

export const metadata: Metadata = { title: "Shop setup" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { session, shop } = await requireShop();
  if (!isAdminRole(session.role)) {
    redirect("/dashboard");
  }

  const { step: stepParam } = await searchParams;
  const furthest = shop.onboardingStep;
  const step = viewOnboardingStep(furthest, parseStepParam(stepParam), Boolean(shop.onboardingCompletedAt));

  const [artists, users, clients, appointmentCount, origin] = await Promise.all([
    prisma.artist.findMany({
      where: { shopId: shop.id },
      select: { id: true, name: true, specialty: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { shopId: shop.id },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.client.findMany({
      where: { shopId: shop.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.count({ where: { shopId: shop.id } }),
    requestOrigin(),
  ]);

  const extraUserCount = users.filter((user) => user.role !== "owner").length;
  const checklist = buildSetupChecklist({
    artistCount: artists.length,
    extraUserCount,
    hasStripeKeys: shopHasStripeKeys(shop),
    clientCount: clients.length,
    appointmentCount,
  });

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="font-serif text-2xl text-ink">Inkdesk</p>
            <p className="text-xs text-muted">{shop.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {shop.onboardingCompletedAt ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <ListChecks className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            ) : null}
            <form action={logOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-serif text-3xl tracking-tight text-ink">Set up the parlor</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          A short path so the floor is usable. Optional steps can be skipped. Staff logins are not
          sent through this guide.
        </p>
        <div className="mt-8">
          <OnboardingWizard
            shop={{
              name: shop.name,
              timezone: shop.timezone,
              hoursOpen: shop.hoursOpen,
              hoursClose: shop.hoursClose,
              hasStripeKeys: shopHasStripeKeys(shop),
            }}
            ownerName={session.name}
            step={step}
            furthest={furthest}
            completed={Boolean(shop.onboardingCompletedAt)}
            artists={artists}
            users={users}
            clients={clients}
            checklist={checklist}
            webhookUrl={`${origin}/api/stripe/webhook/${shop.id}`}
          />
        </div>
      </main>
    </div>
  );
}
