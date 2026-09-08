"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsSchema, type ActionState } from "@/lib/validations";

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
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
  revalidatePath("/dashboard");
  revalidatePath("/appointments");
  redirect("/settings?saved=1");
}
