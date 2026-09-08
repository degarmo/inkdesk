import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CLIENT_TAGS, SERVICE_TYPES, APPOINTMENT_STATUSES, IMAGE_KINDS } from "./constants";

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
