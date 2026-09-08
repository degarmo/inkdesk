"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/secrets";
import { settingsSchema, stripeSettingsSchema, type ActionState } from "@/lib/validations";

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireShop();
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
    data: parsed.data,
  });

  revalidatePath("/settings");
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  revalidatePath("/appointments");
  const next = String(formData.get("redirectTo") ?? "/settings");
  const path = next.startsWith("/admin/settings") ? "/admin/settings?saved=1" : "/settings?saved=1";
  redirect(path);
}

export async function updateStripeSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireAdmin();
  const parsed = stripeSettingsSchema.safeParse({
    stripePublishableKey: formData.get("stripePublishableKey") ?? "",
    stripeSecretKey: formData.get("stripeSecretKey") ?? "",
    stripeWebhookSecret: formData.get("stripeWebhookSecret") ?? "",
    clearStripe: formData.get("clearStripe") === "on" || formData.get("clearStripe") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the Stripe keys and try again." };
  }

  if (parsed.data.clearStripe) {
    await prisma.shop.update({
      where: { id: session.shopId },
      data: {
        stripePublishableKey: "",
        stripeSecretKey: "",
        stripeWebhookSecret: "",
      },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/appointments");
    redirect("/admin/settings?stripe=1");
  }

  const data: {
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
  } = {};

  if (parsed.data.stripePublishableKey) {
    data.stripePublishableKey = parsed.data.stripePublishableKey;
  }
  if (parsed.data.stripeSecretKey) {
    data.stripeSecretKey = encryptSecret(parsed.data.stripeSecretKey);
  }
  if (parsed.data.stripeWebhookSecret) {
    data.stripeWebhookSecret = encryptSecret(parsed.data.stripeWebhookSecret);
  }

  if (Object.keys(data).length === 0) {
    return {
      error: "Paste a new key to update, or leave the secret fields blank to keep what is already saved.",
    };
  }

  await prisma.shop.update({
    where: { id: session.shopId },
    data,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  redirect("/admin/settings?stripe=1");
}
