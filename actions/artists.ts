"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { artistSchema, type ActionState } from "@/lib/validations";

export async function createArtist(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = artistSchema.safeParse({
    name: formData.get("name"),
    specialty: formData.get("specialty") ?? "",
    active: formData.get("active") === "on",
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

  revalidatePath("/artists");
  revalidatePath("/appointments");
  redirect("/artists?saved=1");
}

export async function updateArtist(artistId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
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

  await prisma.artist.update({
    where: { id: artistId },
    data: {
      name: parsed.data.name,
      specialty: parsed.data.specialty,
      active: parsed.data.active,
    },
  });

  revalidatePath("/artists");
  revalidatePath("/appointments");
  redirect("/artists?saved=1");
}
