import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { shopStripeCredentials, shopWebhookSecret, stripeForSecret } from "@/lib/stripe";

function peekShopId(raw: string): string | null {
  try {
    const json = JSON.parse(raw) as {
      data?: { object?: { metadata?: { shopId?: unknown } } };
    };
    const id = json.data?.object?.metadata?.shopId;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

async function markPaymentFromSession(session: Stripe.Checkout.Session, expectedShopId: string) {
  const paymentId = session.metadata?.paymentId || session.client_reference_id;
  if (!paymentId) return;

  const payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment || payment.shopId !== expectedShopId) return;

  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "succeeded",
      stripeSessionId: session.id,
      stripePaymentIntentId: intent,
    },
  });

  if (payment.type === "deposit" && payment.appointmentId) {
    await prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: { depositPaid: true },
    });
  }

  revalidatePath("/admin/payments");
  revalidatePath("/dashboard");
  if (payment.appointmentId) {
    revalidatePath(`/appointments/${payment.appointmentId}`);
    revalidatePath("/admin/appointments");
  }
  if (payment.clientId) {
    revalidatePath(`/clients/${payment.clientId}`);
  }
}

async function failOrCancelPayment(session: Stripe.Checkout.Session, expectedShopId: string, status: "failed" | "canceled") {
  const paymentId = session.metadata?.paymentId || session.client_reference_id;
  if (!paymentId) return;
  await prisma.payment.updateMany({
    where: { id: paymentId, shopId: expectedShopId, status: "pending" },
    data: { status },
  });
}

async function applyEvent(event: Stripe.Event, expectedShopId: string) {
  if (event.type === "checkout.session.completed") {
    await markPaymentFromSession(event.data.object, expectedShopId);
    return;
  }
  if (event.type === "checkout.session.expired") {
    await failOrCancelPayment(event.data.object, expectedShopId, "canceled");
    return;
  }
  if (event.type === "checkout.session.async_payment_failed") {
    await failOrCancelPayment(event.data.object, expectedShopId, "failed");
  }
}

export async function handleStripeWebhook(request: Request, shopIdFromPath?: string) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const raw = await request.text();
  const peekedId = shopIdFromPath || peekShopId(raw);
  if (!peekedId) {
    return NextResponse.json({ error: "Could not identify parlor for this webhook." }, { status: 400 });
  }

  const shop = await prisma.shop.findUnique({
    where: { id: peekedId },
    select: {
      id: true,
      stripePublishableKey: true,
      stripeSecretKey: true,
      stripeWebhookSecret: true,
    },
  });
  if (!shop) {
    return NextResponse.json({ error: "Unknown parlor." }, { status: 404 });
  }

  const webhookSecret = shopWebhookSecret(shop);
  const creds = shopStripeCredentials(shop);
  if (!webhookSecret || !creds) {
    return NextResponse.json({ error: "This parlor has no Stripe webhook secret." }, { status: 503 });
  }

  const stripe = stripeForSecret(creds.secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const eventShopId =
    event.type.startsWith("checkout.session.") && "metadata" in event.data.object
      ? event.data.object.metadata?.shopId
      : undefined;
  if (eventShopId && eventShopId !== shop.id) {
    return NextResponse.json({ error: "Shop mismatch." }, { status: 400 });
  }
  if (shopIdFromPath && shopIdFromPath !== shop.id) {
    return NextResponse.json({ error: "Shop mismatch." }, { status: 400 });
  }

  await applyEvent(event, shop.id);
  return NextResponse.json({ received: true });
}
