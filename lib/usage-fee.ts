/** Parlor cut of artist usage of space and products. Not Inkdesk billing. */

export const USAGE_FEE_MIN = 0;
export const USAGE_FEE_MAX = 100;

export const USAGE_FEE_HELP =
  "Taken out of each artist’s earnings for use of the parlor’s space and products (chair time, inks, and shop supplies). It is not added on the client’s bill. It is not Inkdesk billing and not a Stripe Connect platform fee.";

export const USAGE_FEE_STAFF_NOTE = "Owner and admin set this. Staff cannot change it.";

export const USAGE_FEE_OWNER_INTRO =
  "Client payments are the gross. The parlor usage fee comes out of artist earnings for space and products — not Inkdesk billing. What remains is the artists’ net.";

export function usageFeePercentNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundUsageFeePercent(percent: number) {
  return Math.round(percent * 10) / 10;
}

export function formatUsageFeePercent(percent: number) {
  const rounded = roundUsageFeePercent(usageFeePercentNumber(percent));
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function artistEarningsIntro(artistName: string, percent: number) {
  return `Earnings on chairs booked to ${artistName}. The parlor takes ${formatUsageFeePercent(percent)} out of that gross for space and products. The rest is yours. This is not Inkdesk billing.`;
}

export function usageFeePercentInput(percent: number) {
  const rounded = roundUsageFeePercent(usageFeePercentNumber(percent));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function shopUsageTakeCents(grossCents: number, usageFeePercent: number) {
  const gross = Number.isFinite(grossCents) ? Math.max(0, Math.round(grossCents)) : 0;
  const percent = usageFeePercentNumber(usageFeePercent);
  if (gross === 0 || percent <= 0) return 0;
  if (percent >= 100) return gross;
  return Math.round((gross * percent) / 100);
}

export function splitGrossCents(grossCents: number, usageFeePercent: number) {
  const gross = Number.isFinite(grossCents) ? Math.max(0, Math.round(grossCents)) : 0;
  const shopTakeCents = shopUsageTakeCents(gross, usageFeePercent);
  return {
    grossCents: gross,
    shopTakeCents,
    artistShareCents: gross - shopTakeCents,
  };
}

/** Staff earnings labels. Same split as shopTake / artistShare. */
export function grossFeeNet(grossCents: number, usageFeePercent: number) {
  const split = splitGrossCents(grossCents, usageFeePercent);
  return {
    grossCents: split.grossCents,
    feeCents: split.shopTakeCents,
    netCents: split.artistShareCents,
  };
}

/** Reads Shop.usageFeePercent; 0 if the field is missing. */
export function usageFeePercentFromShop(shop: object | null | undefined) {
  if (!shop || !("usageFeePercent" in shop)) return 0;
  return usageFeePercentNumber((shop as { usageFeePercent?: unknown }).usageFeePercent ?? 0);
}
