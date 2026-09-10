"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createShopUserRecord } from "@/lib/shop-users";
import { shopUserRoleSchema, shopUserSchema, type ActionState } from "@/lib/validations";

function revalidateUsers() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

async function ownerCount(shopId: string) {
  return prisma.user.count({ where: { shopId, role: "owner", active: true } });
}

export async function createShopUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireAdmin();
  const parsed = shopUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "staff",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
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

  revalidateUsers();
  redirect("/admin/users?saved=1");
}

export async function updateShopUserRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireAdmin();
  const parsed = shopUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, shopId: session.shopId },
  });
  if (!target) {
    return { error: "User not found." };
  }

  if (target.role === "owner" && parsed.data.role !== "owner" && target.active) {
    if ((await ownerCount(session.shopId)) <= 1) {
      return { error: "Keep at least one active owner on the shop." };
    }
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
  });

  revalidateUsers();
  redirect("/admin/users?saved=1");
}

export async function setShopUserActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session } = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const active = formData.get("active") === "true";
  const target = await prisma.user.findFirst({
    where: { id: userId, shopId: session.shopId },
  });
  if (!target) {
    return { error: "User not found." };
  }
  if (target.id === session.id && !active) {
    return { error: "You cannot deactivate your own login." };
  }
  if (target.role === "owner" && target.active && !active) {
    if ((await ownerCount(session.shopId)) <= 1) {
      return { error: "Keep at least one active owner on the shop." };
    }
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { active },
  });

  revalidateUsers();
  redirect("/admin/users?saved=1");
}
