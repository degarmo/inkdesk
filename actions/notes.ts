"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { replayOrCreate } from "@/lib/idempotency";
import { prisma } from "@/lib/prisma";
import { sessionNoteSchema, type ActionState } from "@/lib/validations";

export async function createSessionNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = sessionNoteSchema.safeParse({
    clientId: formData.get("clientId"),
    appointmentId: formData.get("appointmentId") ?? "",
    designNotes: formData.get("sessionDesignNotes") ?? formData.get("designNotes") ?? "",
    placement: formData.get("sessionPlacement") ?? formData.get("placement") ?? "",
    inkColors: formData.get("sessionInk") ?? formData.get("inkColors") ?? "",
    aftercareGiven: formData.get("aftercareGiven") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, shopId: session.shopId },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  const appointmentId: string | null = parsed.data.appointmentId || null;
  if (appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, shopId: session.shopId, clientId: client.id },
    });
    if (!appointment) {
      return { error: "That appointment is not on this client." };
    }
  }

  await replayOrCreate(
    session.shopId,
    "session-note",
    String(formData.get("idempotencyKey") ?? ""),
    async (tx) => {
      const note = await tx.sessionNote.create({
        data: {
          shopId: session.shopId,
          clientId: client.id,
          appointmentId,
          designNotes: parsed.data.designNotes,
          placement: parsed.data.placement,
          inkColors: parsed.data.inkColors,
          aftercareGiven: parsed.data.aftercareGiven,
        },
      });
      return note.id;
    },
  );

  revalidatePath(`/clients/${client.id}`);
  if (appointmentId) {
    revalidatePath(`/appointments/${appointmentId}`);
    redirect(`/appointments/${appointmentId}?note=1`);
  }
  redirect(`/clients/${client.id}?note=1`);
}
