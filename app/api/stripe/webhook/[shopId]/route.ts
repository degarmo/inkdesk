import { handleStripeWebhook } from "@/lib/stripe-webhook";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await params;
  return handleStripeWebhook(request, shopId);
}
