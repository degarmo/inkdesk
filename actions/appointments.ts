"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { zonedDateTime } from "@/lib/dates";
import { dollarsToCents } from "@/lib/utils";
import { appointmentSchema, type ActionState } from "@/lib/validations";

async function shopTimezone(shopId: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  return shop?.timezone ?? "America/Los_Angeles";
}

async function syncLastVisit(clientId: string, shopId: string) {
  const latest = await prisma.appointment.findFirst({
    where: { clientId, shopId, status: "completed" },
    orderBy: { startAt: "desc" },
  });
  await prisma.client.update({
    where: { id: clientId },
    data: { lastVisit: latest?.startAt ?? null },
  });
}

export async function createAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = appointmentSchema.safeParse({
    clientId: formData.get("clientId"),
    artistId: formData.get("artistId"),
    date: formData.get("date"),
    time: formData.get("time"),
    durationMin: formData.get("durationMin"),
    serviceType: formData.get("serviceType"),
    status: formData.get("status") || "scheduled",
    depositAmount: formData.get("depositAmount") || 0,
    depositPaid: formData.get("depositPaid") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [client, artist] = await Promise.all([
    prisma.client.findFirst({ where: { id: parsed.data.clientId, shopId: session.shopId } }),
    prisma.artist.findFirst({ where: { id: parsed.data.artistId, shopId: session.shopId } }),
  ]);
  if (!client || !artist) {
    return { error: "Client or artist is not on this shop." };
  }

  const timezone = await shopTimezone(session.shopId);
  const startAt = zonedDateTime(parsed.data.date, parsed.data.time, timezone);

  const appointment = await prisma.appointment.create({
    data: {
      shopId: session.shopId,
      clientId: parsed.data.clientId,
      artistId: parsed.data.artistId,
      startAt,
      durationMin: parsed.data.durationMin,
      serviceType: parsed.data.serviceType,
      status: parsed.data.status,
      depositCents: dollarsToCents(parsed.data.depositAmount),
      depositPaid: parsed.data.depositPaid,
    },
  });

  if (parsed.data.status === "completed") {
    await syncLastVisit(parsed.data.clientId, session.shopId);
  }

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  redirect(`/appointments/${appointment.id}`);
}

export async function updateAppointment(
  appointmentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = appointmentSchema.safeParse({
    clientId: formData.get("clientId"),
    artistId: formData.get("artistId"),
    date: formData.get("date"),
    time: formData.get("time"),
    durationMin: formData.get("durationMin"),
    serviceType: formData.get("serviceType"),
    status: formData.get("status") || "scheduled",
    depositAmount: formData.get("depositAmount") || 0,
    depositPaid: formData.get("depositPaid") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, shopId: session.shopId },
  });
  if (!existing) {
    return { error: "Appointment not found." };
  }

  const timezone = await shopTimezone(session.shopId);
  const startAt = zonedDateTime(parsed.data.date, parsed.data.time, timezone);

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      clientId: parsed.data.clientId,
      artistId: parsed.data.artistId,
      startAt,
      durationMin: parsed.data.durationMin,
      serviceType: parsed.data.serviceType,
      status: parsed.data.status,
      depositCents: dollarsToCents(parsed.data.depositAmount),
      depositPaid: parsed.data.depositPaid,
    },
  });

  await syncLastVisit(parsed.data.clientId, session.shopId);
  if (existing.clientId !== parsed.data.clientId) {
    await syncLastVisit(existing.clientId, session.shopId);
  }

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { success: "Appointment saved." };
}

export async function markDepositPaid(appointmentId: string) {
  const session = await requireSession();
  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, shopId: session.shopId },
  });
  if (!existing) {
    return;
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { depositPaid: true },
  });

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/dashboard");
}
