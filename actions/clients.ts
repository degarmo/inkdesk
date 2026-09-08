"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stringifyTags } from "@/lib/utils";
import { clientSchema, type ActionState } from "@/lib/validations";

function tagsFromForm(formData: FormData) {
  return formData.getAll("tags").filter((value): value is string => typeof value === "string");
}

export async function createClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
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

  const client = await prisma.client.create({
    data: {
      shopId: session.shopId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      notes: parsed.data.notes,
      tags: stringifyTags(parsed.data.tags),
    },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(clientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
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

  const existing = await prisma.client.findFirst({
    where: { id: clientId, shopId: session.shopId },
  });
  if (!existing) {
    return { error: "Client not found." };
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      notes: parsed.data.notes,
      tags: stringifyTags(parsed.data.tags),
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: "Client updated." };
}
