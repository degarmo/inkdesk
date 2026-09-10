import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const EMAIL_TAKEN_MESSAGE = "An account with that email already exists.";

export function isUniqueEmailError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function hashShopPassword(password: string) {
  return hash(password, 12);
}

export async function loginEmailTaken(email: string) {
  const normalized = email.toLowerCase();
  const [user, platformUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalized }, select: { id: true } }),
    prisma.platformUser.findUnique({ where: { email: normalized }, select: { id: true } }),
  ]);
  return Boolean(user || platformUser);
}

export function shopUserCreateData(input: {
  shopId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}) {
  return {
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    role: input.role,
    active: true,
    shopId: input.shopId,
  };
}

export async function createShopUserRecord(input: {
  shopId: string;
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const email = input.email.toLowerCase();
  if (await loginEmailTaken(email)) {
    return { error: EMAIL_TAKEN_MESSAGE };
  }

  try {
    const user = await prisma.user.create({
      data: shopUserCreateData({
        shopId: input.shopId,
        name: input.name,
        email,
        passwordHash: await hashShopPassword(input.password),
        role: input.role,
      }),
    });
    return { user, email };
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return { error: EMAIL_TAKEN_MESSAGE };
    }
    throw error;
  }
}
