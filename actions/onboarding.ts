"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminRole, requireAdmin, requireShop } from "@/lib/auth";
import { replayOrCreate } from "@/lib/idempotency";
import { clampOnboardingStep } from "@/lib/onboarding";
import { generateTempPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/secrets";
import { createShopUserRecord } from "@/lib/shop-users";
import { stringifyTags } from "@/lib/utils";
import {
  artistSchema,
  clientSchema,
  settingsSchema,
  shopUserSchema,
  stripeSettingsSchema,
  type ActionState,
  type CredentialActionState,
} from "@/lib/validations";

export type InviteActionState = CredentialActionState;

function revalidateOnboarding() {
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/admin/settings");
  revalidatePath("/artists");
  revalidatePath("/clients");
  revalidatePath("/admin/users");
}

async function requireOnboardingAdmin() {
  const { session, shop } = await requireShop();
  if (!isAdminRole(session.role)) {
    redirect("/dashboard");
  }
  return { session, shop };
}

async function setStep(shopId: string, step: number) {
  await prisma.shop.update({
    where: { id: shopId },
    data: { onboardingStep: clampOnboardingStep(step) },
  });
}

function tagsFromForm(formData: FormData) {
  return formData.getAll("tags").filter((value): value is string => typeof value === "string");
}

export async function saveOnboardingProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireOnboardingAdmin();
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    hoursOpen: formData.get("hoursOpen"),
    hoursClose: formData.get("hoursClose"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await prisma.shop.update({
    where: { id: session.shopId },
    data: {
      ...parsed.data,
      onboardingStep: 2,
    },
  });

  revalidateOnboarding();
  redirect("/onboarding?step=2");
}

export async function addOnboardingArtist(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireOnboardingAdmin();
  const parsed = artistSchema.safeParse({
    name: formData.get("name"),
    specialty: formData.get("specialty") ?? "",
    active: formData.get("active") !== "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await prisma.artist.create({
    data: {
      shopId: session.shopId,
      name: parsed.data.name,
      specialty: parsed.data.specialty,
      active: parsed.data.active,
    },
  });
  await setStep(session.shopId, 3);
  revalidateOnboarding();
  redirect("/onboarding?step=3");
}

export async function addOwnerAsArtist(_formData?: FormData): Promise<void> {
  const { session } = await requireOnboardingAdmin();
  const existingByUser = await prisma.artist.findFirst({
    where: { shopId: session.shopId, userId: session.id },
  });
  if (!existingByUser) {
    const existingByName = await prisma.artist.findFirst({
      where: { shopId: session.shopId, name: session.name },
    });
    if (existingByName) {
      if (!existingByName.userId) {
        await prisma.artist.update({
          where: { id: existingByName.id },
          data: { userId: session.id },
        });
      }
    } else {
      await prisma.artist.create({
        data: {
          shopId: session.shopId,
          name: session.name,
          specialty: "",
          active: true,
          userId: session.id,
        },
      });
    }
  }
  await setStep(session.shopId, 3);
  revalidateOnboarding();
  redirect("/onboarding?step=3");
}

export async function continueOnboardingArtist(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { session, shop } = await requireOnboardingAdmin();
  const count = await prisma.artist.count({ where: { shopId: session.shopId } });
  if (count === 0) {
    return { error: "Add at least one artist, or choose \"I'm the only artist\"." };
  }
  await setStep(session.shopId, Math.max(shop.onboardingStep, 3));
  revalidateOnboarding();
  redirect("/onboarding?step=3");
}

export async function inviteOnboardingUser(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const { session } = await requireOnboardingAdmin();
  const providedPassword = String(formData.get("password") ?? "").trim();
  const password = providedPassword || generateTempPassword();
  const parsed = shopUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password,
    role: formData.get("role") || "staff",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  if (parsed.data.role === "owner") {
    return { error: "Invite staff or admin here. Owner stays the account that signed up." };
  }

  const created = await createShopUserRecord({
    shopId: session.shopId,
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    role: parsed.data.role,
  });
  if ("error" in created) {
    return { error: created.error };
  }

  await setStep(session.shopId, 3);
  revalidateOnboarding();
  return {
    success:
      "Login created. Invite email is not sent — email delivery is not wired yet. Copy these credentials and share them yourself.",
    email: created.email,
    password: parsed.data.password,
    name: parsed.data.name,
    role: parsed.data.role,
  };
}

export async function skipOnboardingTeam(): Promise<void> {
  const { session } = await requireOnboardingAdmin();
  await setStep(session.shopId, 4);
  revalidateOnboarding();
  redirect("/onboarding?step=4");
}

export async function saveOnboardingStripe(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireAdmin();
  const parsed = stripeSettingsSchema.safeParse({
    stripePublishableKey: formData.get("stripePublishableKey") ?? "",
    stripeSecretKey: formData.get("stripeSecretKey") ?? "",
    stripeWebhookSecret: formData.get("stripeWebhookSecret") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the Stripe keys and try again." };
  }

  const data: {
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
    onboardingStep: number;
  } = { onboardingStep: 5 };

  if (parsed.data.stripePublishableKey) {
    data.stripePublishableKey = parsed.data.stripePublishableKey;
  }
  if (parsed.data.stripeSecretKey) {
    data.stripeSecretKey = encryptSecret(parsed.data.stripeSecretKey);
  }
  if (parsed.data.stripeWebhookSecret) {
    data.stripeWebhookSecret = encryptSecret(parsed.data.stripeWebhookSecret);
  }
  if (!parsed.data.stripePublishableKey && !parsed.data.stripeSecretKey && !parsed.data.stripeWebhookSecret) {
    return { error: "Paste at least one key, or skip if you mostly take cash." };
  }

  await prisma.shop.update({
    where: { id: session.shopId },
    data,
  });
  revalidateOnboarding();
  redirect("/onboarding?step=5");
}

export async function skipOnboardingPayments(): Promise<void> {
  const { session } = await requireOnboardingAdmin();
  await setStep(session.shopId, 5);
  revalidateOnboarding();
  redirect("/onboarding?step=5");
}

export async function addOnboardingClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireOnboardingAdmin();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
    tags: tagsFromForm(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await replayOrCreate(session.shopId, "client", String(formData.get("idempotencyKey") ?? ""), async (tx) => {
    const client = await tx.client.create({
      data: {
        shopId: session.shopId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        notes: parsed.data.notes,
        tags: stringifyTags(parsed.data.tags),
      },
    });
    return client.id;
  });
  await setStep(session.shopId, 6);
  revalidateOnboarding();
  redirect("/onboarding?step=6");
}

export async function skipOnboardingClient(): Promise<void> {
  const { session } = await requireOnboardingAdmin();
  await setStep(session.shopId, 6);
  revalidateOnboarding();
  redirect("/onboarding?step=6");
}

export async function completeOnboarding(): Promise<void> {
  const { session } = await requireOnboardingAdmin();
  await prisma.shop.update({
    where: { id: session.shopId },
    data: {
      onboardingCompletedAt: new Date(),
      onboardingStep: 6,
    },
  });
  revalidateOnboarding();
  redirect("/dashboard?setup=1");
}

/** Finish without remaining optional steps. Shop stays tenant-scoped; no platform billing is created. */
export async function skipOnboardingToEnd(): Promise<void> {
  const { session } = await requireOnboardingAdmin();
  await prisma.shop.update({
    where: { id: session.shopId },
    data: {
      onboardingCompletedAt: new Date(),
      onboardingStep: 6,
    },
  });
  revalidateOnboarding();
  redirect("/dashboard?setup=1");
}

export async function reopenOnboarding(): Promise<void> {
  const { session, shop } = await requireAdmin();
  if (shop.onboardingCompletedAt) {
    await prisma.shop.update({
      where: { id: session.shopId },
      data: { onboardingStep: 1 },
    });
  }
  revalidateOnboarding();
  const step = shop.onboardingCompletedAt ? 1 : clampOnboardingStep(shop.onboardingStep);
  redirect(`/onboarding?step=${step}`);
}
