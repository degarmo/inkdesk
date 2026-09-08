import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "enc:v1:";
const SALT = "inkdesk-shop-stripe-v1";

function keyBytes() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return scryptSync(secret, SALT, 32);
}

export function encryptSecret(plain: string) {
  const value = plain.trim();
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(stored: string) {
  const value = stored.trim();
  if (!value) return "";
  if (!value.startsWith(PREFIX)) {
    return value;
  }
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function maskSecret(plain: string) {
  const value = plain.trim();
  if (!value) return "";
  if (value.length <= 10) return "•••• saved";
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}
