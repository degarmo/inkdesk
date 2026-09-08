export const CLIENT_TAGS = [
  { value: "walk-in", label: "Walk-in" },
  { value: "regular", label: "Regular" },
  { value: "referral", label: "Referral" },
  { value: "cover-up", label: "Cover-up" },
  { value: "first-timer", label: "First-timer" },
] as const;

export const SERVICE_TYPES = [
  { value: "consult", label: "Consult" },
  { value: "tattoo", label: "Tattoo session" },
  { value: "touch-up", label: "Touch-up" },
] as const;

export const APPOINTMENT_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no-show", label: "No-show" },
] as const;

export const DURATIONS = [30, 60, 90, 120, 180, 240, 300] as const;

export const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Toronto",
  "Europe/London",
  "Europe/Berlin",
  "Australia/Sydney",
  "UTC",
] as const;

export const IMAGE_KINDS = [
  { value: "reference", label: "Reference" },
  { value: "design", label: "Design" },
  { value: "healed", label: "Healed" },
  { value: "other", label: "Other" },
] as const;

export const USER_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
] as const;

export const PAYMENT_TYPES = [
  { value: "deposit", label: "Deposit" },
  { value: "balance", label: "Balance" },
  { value: "other", label: "Other" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
] as const;

export const SESSION_COOKIE = "inkdesk_session";
export const PLATFORM_COOKIE = "inkdesk_platform";
export const SESSION_DAYS = 7;

export const STRIPE_NOT_CONFIGURED = "Connect Stripe in Admin → Settings";

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_PER_CLIENT = 50;
export const IMAGE_MAX_PER_APPOINTMENT = 20;

export type ClientTag = (typeof CLIENT_TAGS)[number]["value"];
export type ServiceType = (typeof SERVICE_TYPES)[number]["value"];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]["value"];
export type ImageKind = (typeof IMAGE_KINDS)[number]["value"];
export type UserRole = (typeof USER_ROLES)[number]["value"];
export type PaymentType = (typeof PAYMENT_TYPES)[number]["value"];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]["value"];
