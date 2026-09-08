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

export const SESSION_COOKIE = "inkdesk_session";
export const SESSION_DAYS = 7;

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_PER_CLIENT = 50;
export const IMAGE_MAX_PER_APPOINTMENT = 20;

export type ClientTag = (typeof CLIENT_TAGS)[number]["value"];
export type ServiceType = (typeof SERVICE_TYPES)[number]["value"];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]["value"];
export type ImageKind = (typeof IMAGE_KINDS)[number]["value"];
