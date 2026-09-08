import { handleStripeWebhook } from "@/lib/stripe-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleStripeWebhook(request);
}
