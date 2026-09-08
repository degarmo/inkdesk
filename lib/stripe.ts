import { headers } from "next/headers";
import Stripe from "stripe";
import { STRIPE_NOT_CONFIGURED } from "@/lib/constants";
import { decryptSecret } from "@/lib/secrets";

export { STRIPE_NOT_CONFIGURED };

export type ShopStripeFields = {
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
};

export type ResolvedStripe = {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  source: "shop" | "env";
};

const clients = new Map<string, Stripe>();

function envFallback(): ResolvedStripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!secretKey) return null;
  return {
    secretKey,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
    source: "env",
  };
}

export function shopStripeCredentials(shop: ShopStripeFields): ResolvedStripe | null {
  const shopSecret = decryptSecret(shop.stripeSecretKey);
  if (shopSecret) {
    return {
      secretKey: shopSecret,
      publishableKey: shop.stripePublishableKey.trim(),
      webhookSecret: decryptSecret(shop.stripeWebhookSecret),
      source: "shop",
    };
  }
  return envFallback();
}

export function shopWebhookSecret(shop: ShopStripeFields): string | null {
  const fromShop = decryptSecret(shop.stripeWebhookSecret);
  if (fromShop) return fromShop;
  const fromEnv = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  return fromEnv || null;
}

export function stripeForSecret(secretKey: string) {
  let client = clients.get(secretKey);
  if (!client) {
    client = new Stripe(secretKey);
    clients.set(secretKey, client);
  }
  return client;
}

export function stripeForShop(shop: ShopStripeFields) {
  const creds = shopStripeCredentials(shop);
  if (!creds) {
    throw new Error(STRIPE_NOT_CONFIGURED);
  }
  return { stripe: stripeForSecret(creds.secretKey), creds };
}

export function stripeConfigured(shop: ShopStripeFields) {
  return shopStripeCredentials(shop) !== null;
}

/** Shop-owned keys only — ignores the local-dev env fallback. */
export function shopHasOwnStripeKeys(shop: ShopStripeFields) {
  return Boolean(
    shop.stripePublishableKey.trim() || shop.stripeSecretKey.trim() || shop.stripeWebhookSecret.trim(),
  );
}

export function publicOrigin() {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://127.0.0.1:43147";
}

export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return publicOrigin();
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
