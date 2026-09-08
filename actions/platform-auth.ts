"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearPlatformSessionCookie, setPlatformSessionCookie } from "@/lib/platform-session";
import { loginSchema, type ActionState } from "@/lib/validations";

export async function platformLogIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const email = parsed.data.email.toLowerCase();
  const parlorUser = await prisma.user.findUnique({ where: { email } });
  if (parlorUser) {
    return { error: "That email is a parlor login. Use shop sign in." };
  }

  const user = await prisma.platformUser.findUnique({
    where: { email },
  });
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  if (!user.active) {
    return { error: "This operator login is deactivated." };
  }

  await setPlatformSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
  });
  redirect("/platform");
}

export async function platformLogOut() {
  await clearPlatformSessionCookie();
  redirect("/platform/login");
}
