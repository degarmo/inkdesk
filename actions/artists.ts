"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminRole, requireSession } from "@/lib/auth";
import { parseArtistLoginFields } from "@/lib/artist-login";
import { prisma } from "@/lib/prisma";
import {
  EMAIL_TAKEN_MESSAGE,
  hashShopPassword,
  isUniqueEmailError,
  loginEmailTaken,
  shopUserCreateData,
} from "@/lib/shop-users";
import { artistSchema, type CredentialActionState } from "@/lib/validations";

function revalidateArtists() {
  revalidatePath("/artists");
  revalidatePath("/appointments");
}

function revalidateLogins() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

function parseOptionalLogin(formData: FormData, name: string) {
  return parseArtistLoginFields({
    createLogin: formData.get("createLogin") === "on",
    name,
    email: formData.get("loginEmail"),
    password: String(formData.get("loginPassword") ?? ""),
    role: formData.get("loginRole") || "staff",
  });
}

function loginCreatedState(login: { name: string; email: string; password: string; role: string }): CredentialActionState {
  return {
    success:
      "Login created. Invite email is not sent — copy these credentials and share them yourself. Inkdesk will not show this password again.",
    email: login.email.toLowerCase(),
    password: login.password,
    name: login.name,
    role: login.role,
  };
}

export async function createArtist(
  _prev: CredentialActionState,
  formData: FormData,
): Promise<CredentialActionState> {
  const session = await requireSession();
  if (!isAdminRole(session.role)) {
    return { error: "Only owners and admins can add artists." };
  }
  const parsed = artistSchema.safeParse({
    name: formData.get("name"),
    specialty: formData.get("specialty") ?? "",
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const loginAttempt = parseOptionalLogin(formData, parsed.data.name);
  if (loginAttempt.wantsLogin) {
    if ("error" in loginAttempt) {
      return { error: loginAttempt.error };
    }
    const login = loginAttempt.login;
    if (await loginEmailTaken(login.email)) {
      return { error: EMAIL_TAKEN_MESSAGE };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: shopUserCreateData({
            shopId: session.shopId,
            name: login.name,
            email: login.email,
            passwordHash: await hashShopPassword(login.password),
            role: login.role,
          }),
        });
        await tx.artist.create({
          data: {
            shopId: session.shopId,
            name: parsed.data.name,
            specialty: parsed.data.specialty,
            active: parsed.data.active,
            userId: user.id,
          },
        });
      });
    } catch (error) {
      if (isUniqueEmailError(error)) {
        return { error: EMAIL_TAKEN_MESSAGE };
      }
      throw error;
    }

    revalidateArtists();
    revalidateLogins();
    return loginCreatedState(login);
  }

  await prisma.artist.create({
    data: {
      shopId: session.shopId,
      name: parsed.data.name,
      specialty: parsed.data.specialty,
      active: parsed.data.active,
    },
  });

  revalidateArtists();
  redirect("/artists?saved=1");
}

export async function updateArtist(
  artistId: string,
  _prev: CredentialActionState,
  formData: FormData,
): Promise<CredentialActionState> {
  const session = await requireSession();
  if (!isAdminRole(session.role)) {
    return { error: "Only owners and admins can change the roster." };
  }
  const parsed = artistSchema.safeParse({
    name: formData.get("name"),
    specialty: formData.get("specialty") ?? "",
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const existing = await prisma.artist.findFirst({
    where: { id: artistId, shopId: session.shopId },
  });
  if (!existing) {
    return { error: "Artist not found." };
  }

  const loginAttempt = parseOptionalLogin(formData, parsed.data.name);
  if (loginAttempt.wantsLogin) {
    if ("error" in loginAttempt) {
      return { error: loginAttempt.error };
    }
    const login = loginAttempt.login;
    if (await loginEmailTaken(login.email)) {
      return { error: EMAIL_TAKEN_MESSAGE };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: shopUserCreateData({
            shopId: session.shopId,
            name: login.name,
            email: login.email,
            passwordHash: await hashShopPassword(login.password),
            role: login.role,
          }),
        });
        await tx.artist.update({
          where: { id: existing.id },
          data: {
            name: parsed.data.name,
            specialty: parsed.data.specialty,
            active: parsed.data.active,
            userId: existing.userId ?? user.id,
          },
        });
      });
    } catch (error) {
      if (isUniqueEmailError(error)) {
        return { error: EMAIL_TAKEN_MESSAGE };
      }
      throw error;
    }

    revalidateArtists();
    revalidateLogins();
    return loginCreatedState(login);
  }

  await prisma.artist.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      specialty: parsed.data.specialty,
      active: parsed.data.active,
    },
  });

  revalidateArtists();
  redirect("/artists?saved=1");
}
