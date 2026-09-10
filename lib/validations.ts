import { z } from "zod";
import { APPOINTMENT_STATUSES, CLIENT_TAGS, IMAGE_KINDS, SERVICE_TYPES, USER_ROLES } from "./constants";

const tagValues = CLIENT_TAGS.map((tag) => tag.value) as [string, ...string[]];
const serviceValues = SERVICE_TYPES.map((item) => item.value) as [string, ...string[]];
const statusValues = APPOINTMENT_STATUSES.map((item) => item.value) as [string, ...string[]];
const imageKindValues = IMAGE_KINDS.map((item) => item.value) as [string, ...string[]];

export const signupSchema = z.object({
  shopName: z.string().trim().min(2, "Shop name is required"),
  name: z.string().trim().min(2, "Your name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  timezone: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().max(40).optional().default(""),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email",
    }),
  notes: z.string().trim().max(2000).optional().default(""),
  tags: z.array(z.enum(tagValues)).optional().default([]),
});

export const artistSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  specialty: z.string().trim().max(120).optional().default(""),
  active: z.boolean(),
});

export const appointmentSchema = z.object({
  clientId: z.string().min(1, "Choose a client"),
  artistId: z.string().min(1, "Choose an artist"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  durationMin: z.coerce.number().int().min(15).max(720),
  serviceType: z.enum(serviceValues),
  status: z.enum(statusValues),
  depositAmount: z.coerce.number().min(0).max(10000),
  depositPaid: z.boolean(),
});

export const sessionNoteSchema = z
  .object({
    clientId: z.string().min(1),
    appointmentId: z.string().optional().default(""),
    designNotes: z.string().trim().max(4000).optional().default(""),
    placement: z.string().trim().max(200).optional().default(""),
    inkColors: z.string().trim().max(400).optional().default(""),
    aftercareGiven: z.boolean(),
  })
  .refine(
    (data) =>
      data.designNotes.length > 0 || data.placement.length > 0 || data.inkColors.length > 0,
    { message: "Add design notes, placement, or ink before saving." },
  );

export const imageMetaSchema = z.object({
  kind: z.enum(imageKindValues),
  caption: z.string().trim().max(200).optional().default(""),
  prepForVisit: z.boolean(),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2, "Shop name is required"),
  timezone: z.string().min(1),
  hoursOpen: z.string().min(1),
  hoursClose: z.string().min(1),
});

function hasAtMostOneDecimal(value: number) {
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-8;
}

/** Shop-wide parlor usage fee. Owner/admin write path only. */
export const usageFeeSchema = z.object({
  usageFeePercent: z.coerce
    .number()
    .min(0, "Usage fee must be between 0 and 100.")
    .max(100, "Usage fee must be between 0 and 100.")
    .refine(hasAtMostOneDecimal, "Use at most one decimal place, for example 12.5."),
});

const roleValues = USER_ROLES.map((item) => item.value) as [string, ...string[]];

export const shopUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(roleValues),
});

export const shopUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(roleValues),
});

export const stripeSettingsSchema = z.object({
  stripePublishableKey: z.string().trim().max(500).optional().default(""),
  stripeSecretKey: z.string().trim().max(500).optional().default(""),
  stripeWebhookSecret: z.string().trim().max(500).optional().default(""),
  clearStripe: z.boolean().optional().default(false),
});

export const checkoutSchema = z.object({
  appointmentId: z.string().min(1),
  type: z.enum(["deposit", "balance", "other"]),
  amountCents: z.coerce.number().int().min(50, "Minimum charge is $0.50").max(1_000_000),
});

export type ActionState = {
  error?: string;
  success?: string;
} | null;

/** Returned when a shop login is created on-screen (no invite email). */
export type CredentialActionState = {
  error?: string;
  success?: string;
  email?: string;
  password?: string;
  name?: string;
  role?: string;
} | null;
