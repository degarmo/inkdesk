import { randomBytes } from "node:crypto";

/** Ambiguous characters (0/O, 1/l/I) omitted so a temp password is easier to read aloud. */
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateTempPassword(length = 12) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => TEMP_PASSWORD_ALPHABET[b % TEMP_PASSWORD_ALPHABET.length]).join("");
}
