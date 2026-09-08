"use server";

import { hash, compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";
import { loginSchema, signupSchema, type ActionState } from "@/lib/validations";

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    shopName: formData.get("shopName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    timezone: formData.get("timezone") || "America/Los_Angeles",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const shop = await prisma.shop.create({
    data: {
      name: parsed.data.shopName,
      timezone: parsed.data.timezone,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      passwordHash: await hash(parsed.data.password, 12),
      shopId: shop.id,
    },
  });

  await setSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    shopId: shop.id,
  });

  redirect("/dashboard");
}

export async function logIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }

  await setSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    shopId: user.shopId,
  });

  redirect("/dashboard");
}

export async function logOut() {
  await clearSessionCookie();
  redirect("/login");
}
