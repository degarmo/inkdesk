"use server";

import { redirect } from "next/navigation";
import { requireShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STRIPE_NOT_CONFIGURED, stripeForShop, requestOrigin } from "@/lib/stripe";
import { dollarsToCents } from "@/lib/utils";
import { checkoutSchema, type ActionState } from "@/lib/validations";

export async function startCheckout(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session, shop } = await requireShop();
  let stripe;
  try {
    stripe = stripeForShop(shop).stripe;
  } catch {
    return { error: STRIPE_NOT_CONFIGURED };
  }

  const dollarsRaw = String(formData.get("amountDollars") ?? "").trim();
  const requestedCents = dollarsRaw
    ? dollarsToCents(dollarsRaw)
    : formData.get("amountCents");

  const parsed = checkoutSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    type: formData.get("type") || "deposit",
    amountCents: requestedCents,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the amount and try again." };
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, shopId: session.shopId },
    include: { client: true },
  });
  if (!appointment) {
    return { error: "Appointment not found." };
  }

  let amountCents = parsed.data.amountCents;
  if (parsed.data.type === "deposit") {
    if (appointment.depositCents <= 0) {
      return { error: "This booking has no deposit to collect." };
    }
    if (appointment.depositPaid) {
      return { error: "The deposit is already marked paid." };
    }
    amountCents = appointment.depositCents;
  }

  const typeLabel =
    parsed.data.type === "deposit" ? "Deposit" : parsed.data.type === "balance" ? "Balance" : "Payment";
  const origin = await requestOrigin();

  const payment = await prisma.payment.create({
    data: {
      shopId: session.shopId,
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      amountCents,
      currency: "usd",
      status: "pending",
      type: parsed.data.type,
    },
  });

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/appointments/${appointment.id}?paid=1`,
      cancel_url: `${origin}/appointments/${appointment.id}?canceled=1`,
      client_reference_id: payment.id,
      customer_email: appointment.client.email || undefined,
      metadata: {
        paymentId: payment.id,
        shopId: session.shopId,
        appointmentId: appointment.id,
        type: parsed.data.type,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `${typeLabel} — ${appointment.client.name}`,
              description: `${shop.name} parlor payment`,
            },
          },
        },
      ],
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: checkout.id },
    });

    if (!checkout.url) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
      return { error: "Stripe did not return a checkout URL." };
    }

    redirect(checkout.url);
  } catch (error) {
    const digest = typeof error === "object" && error && "digest" in error ? String((error as { digest?: string }).digest) : "";
    if (digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
    const message = error instanceof Error ? error.message : "Stripe Checkout failed.";
    return { error: message };
  }
}
