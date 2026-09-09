import { isAdminRole } from "@/lib/utils";
import { shopHasOwnStripeKeys, type ShopStripeFields } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const ONBOARDING_STEP_COUNT = 6;

export const ONBOARDING_STEPS = [
  { id: 1, key: "profile", title: "Shop profile", optional: false },
  { id: 2, key: "artist", title: "First artist", optional: false },
  { id: 3, key: "team", title: "Invite team", optional: true },
  { id: 4, key: "payments", title: "Payments", optional: true },
  { id: 5, key: "client", title: "First client", optional: true },
  { id: 6, key: "done", title: "Done", optional: false },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export function clampOnboardingStep(step: number): OnboardingStepId {
  if (!Number.isFinite(step)) return 1;
  return Math.min(ONBOARDING_STEP_COUNT, Math.max(1, Math.trunc(step))) as OnboardingStepId;
}

export function needsOnboarding(
  role: string,
  shop: { onboardingCompletedAt: Date | null },
) {
  if (shop.onboardingCompletedAt) return false;
  return isAdminRole(role);
}

/** Floor routes staff and finished shops can open. Settings stay reachable so Stripe keys can be pasted. */
export function isOnboardingEscapePath(path: string) {
  return path === "/settings" || path === "/admin/settings";
}

export function viewOnboardingStep(furthest: number, requested: number | null, completed: boolean) {
  const current = clampOnboardingStep(furthest);
  if (requested == null) return current;
  const wanted = clampOnboardingStep(requested);
  if (completed || wanted <= current) return wanted;
  return current;
}

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
  detail: string;
};

export function buildSetupChecklist(input: {
  artistCount: number;
  extraUserCount: number;
  hasStripeKeys: boolean;
  clientCount: number;
  appointmentCount: number;
}): ChecklistItem[] {
  return [
    {
      id: "artist",
      label: "Add an artist to the roster",
      done: input.artistCount > 0,
      href: "/artists",
      detail: "Bookings need a name on the chair.",
    },
    {
      id: "team",
      label: "Invite a teammate",
      done: input.extraUserCount > 0,
      href: "/admin/users",
      detail: "Optional. Owners can run the floor alone.",
    },
    {
      id: "stripe",
      label: "Connect this parlor’s Stripe account",
      done: input.hasStripeKeys,
      href: "/admin/settings",
      detail: "Skip if you mostly take cash. Card deposits need keys in parlor settings.",
    },
    {
      id: "client",
      label: "Add a client",
      done: input.clientCount > 0,
      href: "/clients/new",
      detail: "The book starts with one card.",
    },
    {
      id: "booking",
      label: "Book the first appointment",
      done: input.appointmentCount > 0,
      href: "/appointments/new",
      detail: "Not part of setup — do this from the floor when you are ready.",
    },
  ];
}

export function shopHasStripeKeys(shop: ShopStripeFields) {
  return shopHasOwnStripeKeys(shop);
}

export function parseStepParam(raw: string | undefined) {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** After signup / login / landing while a parlor session exists. */
export async function parlorEntryPath(session: { role: string; shopId: string }) {
  if (!isAdminRole(session.role)) return "/dashboard";
  const shop = await prisma.shop.findUnique({
    where: { id: session.shopId },
    select: { onboardingCompletedAt: true },
  });
  if (shop && !shop.onboardingCompletedAt) return "/onboarding";
  return "/dashboard";
}
