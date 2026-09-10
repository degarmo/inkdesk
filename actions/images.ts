"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  assertAppointmentCap,
  assertClientCap,
  listAppointmentImages as listAppointmentImagesForShop,
  listClientImages as listClientImagesForShop,
  readFormUpload,
  storageKeyFor,
  validateUploadBytes,
  writeShopImage,
  type ImageRecord,
} from "@/lib/images";
import { prisma } from "@/lib/prisma";
import { imageMetaSchema, type ActionState } from "@/lib/validations";

export async function listClientImages(clientId: string): Promise<ImageRecord[]> {
  const session = await requireSession();
  return listClientImagesForShop(session.shopId, clientId);
}

export async function listAppointmentImages(appointmentId: string): Promise<ImageRecord[]> {
  const session = await requireSession();
  return listAppointmentImagesForShop(session.shopId, appointmentId);
}

function redirectTo(formData: FormData, fallback: string, query = "image=1"): never {
  const raw = String(formData.get("redirectTo") ?? fallback);
  const url = raw.startsWith("/") ? raw.split("?")[0] : fallback;
  redirect(`${url}?${query}`);
}

function revalidateImagePaths(clientId: string, appointmentId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  if (appointmentId) {
    revalidatePath(`/appointments/${appointmentId}`);
  }
}

export async function uploadClientImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const clientId = String(formData.get("clientId") ?? "");
  const appointmentIdRaw = String(formData.get("appointmentId") ?? "");
  const appointmentId = appointmentIdRaw || null;
  const parsed = imageMetaSchema.safeParse({
    kind: formData.get("kind") || "reference",
    caption: formData.get("caption") ?? "",
    prepForVisit: formData.get("prepForVisit") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, shopId: session.shopId },
    select: { id: true },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  if (appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, shopId: session.shopId, clientId },
      select: { id: true },
    });
    if (!appointment) {
      return { error: "That appointment is not on this client." };
    }
    const apptCap = await assertAppointmentCap(session.shopId, appointmentId);
    if (apptCap) return { error: apptCap };
  }

  const clientCap = await assertClientCap(session.shopId, clientId);
  if (clientCap) return { error: clientCap };

  const uploaded = await readFormUpload(formData.get("file"));
  if ("error" in uploaded) {
    return { error: uploaded.error };
  }

  const checked = validateUploadBytes(uploaded.bytes, uploaded.type);
  if ("error" in checked) {
    return { error: checked.error };
  }

  const id = crypto.randomUUID();
  const storageKey = storageKeyFor(session.shopId, clientId, id, checked.ext);
  try {
    await writeShopImage(storageKey, checked.bytes);
  } catch {
    return {
      error:
        "Could not save the photo file. Try again. If this keeps happening, parlor storage may be missing, unwritable, or full.",
    };
  }

  try {
    await prisma.clientImage.create({
      data: {
        id,
        shopId: session.shopId,
        clientId,
        appointmentId,
        kind: parsed.data.kind,
        prepForVisit: parsed.data.prepForVisit,
        caption: parsed.data.caption,
        storageKey,
        mimeType: checked.mime,
        byteSize: checked.bytes.length,
        width: checked.width,
        height: checked.height,
        uploadedById: session.id,
      },
    });
  } catch {
    return {
      error: "The photo file was written but the parlor record could not be saved. Try again.",
    };
  }

  revalidateImagePaths(clientId, appointmentId);
  redirectTo(formData, appointmentId ? `/appointments/${appointmentId}` : `/clients/${clientId}`);
}

export async function attachClientImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const imageId = String(formData.get("imageId") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "");

  const source = await prisma.clientImage.findFirst({
    where: { id: imageId, shopId: session.shopId, deletedAt: null },
  });
  if (!source) {
    return { error: "Image not found." };
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, shopId: session.shopId, clientId: source.clientId },
    select: { id: true, clientId: true },
  });
  if (!appointment) {
    return { error: "That appointment is not on this client." };
  }

  const already = await prisma.clientImage.findFirst({
    where: {
      shopId: session.shopId,
      appointmentId,
      storageKey: source.storageKey,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (already) {
    return { error: "That image is already on this booking." };
  }

  const cap = await assertAppointmentCap(session.shopId, appointmentId);
  if (cap) return { error: cap };

  if (!source.appointmentId) {
    await prisma.clientImage.update({
      where: { id: source.id },
      data: { appointmentId },
    });
  } else {
    await prisma.clientImage.create({
      data: {
        shopId: session.shopId,
        clientId: source.clientId,
        appointmentId,
        kind: source.kind,
        prepForVisit: source.prepForVisit,
        caption: source.caption,
        storageKey: source.storageKey,
        mimeType: source.mimeType,
        byteSize: source.byteSize,
        width: source.width,
        height: source.height,
        uploadedById: session.id,
      },
    });
  }

  revalidateImagePaths(source.clientId, appointmentId);
  redirectTo(formData, `/appointments/${appointmentId}`);
}

export async function updateImageMeta(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const imageId = String(formData.get("imageId") ?? "");
  const parsed = imageMetaSchema.safeParse({
    kind: formData.get("kind") || "reference",
    caption: formData.get("caption") ?? "",
    prepForVisit: formData.get("prepForVisit") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const existing = await prisma.clientImage.findFirst({
    where: { id: imageId, shopId: session.shopId, deletedAt: null },
  });
  if (!existing) {
    return { error: "Image not found." };
  }

  await prisma.clientImage.update({
    where: { id: imageId },
    data: {
      kind: parsed.data.kind,
      caption: parsed.data.caption,
      prepForVisit: parsed.data.prepForVisit,
    },
  });

  revalidateImagePaths(existing.clientId, existing.appointmentId);
  redirectTo(formData, existing.appointmentId ? `/appointments/${existing.appointmentId}` : `/clients/${existing.clientId}`);
}

export async function softDeleteImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const imageId = String(formData.get("imageId") ?? "");
  const existing = await prisma.clientImage.findFirst({
    where: { id: imageId, shopId: session.shopId, deletedAt: null },
  });
  if (!existing) {
    return { error: "Image not found." };
  }

  await prisma.clientImage.update({
    where: { id: imageId },
    data: { deletedAt: new Date() },
  });

  revalidateImagePaths(existing.clientId, existing.appointmentId);
  redirectTo(formData, existing.appointmentId ? `/appointments/${existing.appointmentId}` : `/clients/${existing.clientId}`);
}
