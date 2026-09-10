import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CLIENT_TAGS, SERVICE_TYPES, APPOINTMENT_STATUSES, IMAGE_KINDS, USER_ROLES, PAYMENT_STATUSES, PAYMENT_TYPES } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseTags(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export function tagLabel(value: string) {
  return CLIENT_TAGS.find((tag) => tag.value === value)?.label ?? value;
}

export function serviceLabel(value: string) {
  return SERVICE_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function statusLabel(value: string) {
  return APPOINTMENT_STATUSES.find((item) => item.value === value)?.label ?? value;
}

export function imageKindLabel(value: string) {
  return IMAGE_KINDS.find((item) => item.value === value)?.label ?? value;
}

export function isAdminRole(role: string) {
  return role === "owner" || role === "admin";
}

export function roleLabel(value: string) {
  return USER_ROLES.find((item) => item.value === value)?.label ?? value;
}

export function paymentStatusLabel(value: string) {
  return PAYMENT_STATUSES.find((item) => item.value === value)?.label ?? value;
}

export function paymentTypeLabel(value: string) {
  return PAYMENT_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function dollarsToCents(raw: string | number) {
  const n = typeof raw === "number" ? raw : Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToDollarsInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/** Same-origin path for post-login return. Only parlor image URLs (optional download=1). */
export function safeLoginNext(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.trim();
  if (!/^\/api\/images\/[A-Za-z0-9_-]+(?:\?download=1)?$/.test(path)) return null;
  return path;
}

/** True for a top-level browser GET (address bar / link), not img/fetch/XHR. */
export function isBrowserDocumentRequest(request: Request): boolean {
  const dest = (request.headers.get("sec-fetch-dest") ?? "").toLowerCase();
  const mode = (request.headers.get("sec-fetch-mode") ?? "").toLowerCase();
  const accept = (request.headers.get("accept") ?? "").toLowerCase();

  if (dest === "image" || dest === "empty") return false;
  if (/\bimage\//.test(accept) && !/\btext\/html\b/.test(accept)) return false;
  if (mode === "navigate" || dest === "document") return true;
  return /\btext\/html\b/.test(accept);
}
