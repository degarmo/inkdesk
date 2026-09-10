import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { IMAGE_KINDS, IMAGE_MAX_BYTES, type ImageKind } from "./constants";
import { absoluteStoragePath } from "./paths";

export const ACCEPTED_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AcceptedMime = keyof typeof ACCEPTED_MIME;

const HEIC_MESSAGE =
  "HEIC photos are not supported yet. Export as JPEG, PNG, or WebP and try again.";
const TYPE_MESSAGE = "Use a JPEG, PNG, or WebP image.";
const SIZE_MESSAGE = "Images must be 10 MB or smaller.";

export function isImageKind(value: string): value is ImageKind {
  return IMAGE_KINDS.some((kind) => kind.value === value);
}

export function wantsImageDownload(request: { url: string }) {
  const raw = new URL(request.url).searchParams.get("download");
  return raw === "1" || raw === "true";
}

export function extensionForImage(mimeType: string, storageKey: string) {
  const normalized = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalized in ACCEPTED_MIME) {
    return ACCEPTED_MIME[normalized as AcceptedMime];
  }
  const match = storageKey.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

export function imageDownloadFilename(input: {
  id: string;
  kind: string;
  caption?: string | null;
  mimeType: string;
  storageKey: string;
}) {
  const ext = extensionForImage(input.mimeType, input.storageKey);
  const raw = (input.caption?.trim() || input.kind || "photo").slice(0, 80);
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "photo"}-${input.id.slice(0, 8)}.${ext}`;
}

export function imageContentHeaders(input: {
  mimeType: string;
  byteLength: number;
  filename: string;
  download: boolean;
}) {
  const dispositionType = input.download ? "attachment" : "inline";
  return {
    "Content-Type": input.mimeType,
    "Content-Length": String(input.byteLength),
    "Content-Disposition": `${dispositionType}; filename="${input.filename}"`,
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
}

/** File, Blob, or a cross-realm File-like from Next server actions — not `instanceof File`. */
export async function readFormUpload(
  file: unknown,
): Promise<{ error: string } | { bytes: Buffer; type: string }> {
  if (file == null || typeof file === "string") {
    return { error: "Choose a JPEG, PNG, or WebP image." };
  }
  const candidate = file as { arrayBuffer?: unknown; size?: unknown; type?: unknown };
  if (typeof candidate.arrayBuffer !== "function" || typeof candidate.size !== "number") {
    return { error: "Choose a JPEG, PNG, or WebP image." };
  }
  if (candidate.size === 0) {
    return { error: "Choose a JPEG, PNG, or WebP image." };
  }
  const buffer = Buffer.from(await (candidate.arrayBuffer as () => Promise<ArrayBuffer>)());
  const type = typeof candidate.type === "string" ? candidate.type : "";
  return { bytes: buffer, type };
}

export async function writeShopImage(storageKey: string, bytes: Buffer) {
  const abs = absoluteStoragePath(storageKey);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
  return abs;
}

export async function readShopImage(storageKey: string) {
  return readFile(absoluteStoragePath(storageKey));
}

export function looksLikeHeic(bytes: Buffer) {
  if (bytes.length < 12) return false;
  if (bytes.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  const brand = bytes.subarray(8, 12).toString("ascii").toLowerCase();
  return ["heic", "heif", "heix", "hevc", "heim", "mif1", "msf1"].includes(brand);
}

export function sniffImage(bytes: Buffer): { mime: AcceptedMime; ext: string } | { error: string } {
  if (bytes.length < 12) {
    return { error: TYPE_MESSAGE };
  }
  if (looksLikeHeic(bytes)) {
    return { error: HEIC_MESSAGE };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (bytes[0] === 0x89 && bytes.subarray(1, 4).toString("ascii") === "PNG") {
    return { mime: "image/png", ext: "png" };
  }
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  return { error: TYPE_MESSAGE };
}

export function rejectDeclaredMime(mime: string | undefined): string | null {
  const normalized = (mime ?? "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (!normalized) return null;
  if (normalized === "image/heic" || normalized === "image/heif" || normalized.startsWith("image/heic") || normalized.startsWith("image/heif")) {
    return HEIC_MESSAGE;
  }
  if (normalized === "image/jpg") return null;
  if (normalized in ACCEPTED_MIME || normalized === "image/jpg") return null;
  if (normalized.startsWith("image/")) return TYPE_MESSAGE;
  return TYPE_MESSAGE;
}

export function stripGpsExif(bytes: Buffer, mime: AcceptedMime): Buffer {
  if (mime === "image/jpeg") return stripJpegApp1(bytes);
  if (mime === "image/png") return stripPngExifChunk(bytes);
  return bytes;
}

function stripJpegApp1(bytes: Buffer): Buffer {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const parts: Buffer[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) {
      parts.push(bytes.subarray(i));
      return Buffer.concat(parts);
    }
    const marker = bytes[i + 1];
    if (marker === 0xda) {
      parts.push(bytes.subarray(i));
      return Buffer.concat(parts);
    }
    if (marker === 0xd9) {
      parts.push(bytes.subarray(i, i + 2));
      return Buffer.concat(parts);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x00) {
      parts.push(bytes.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const length = bytes.readUInt16BE(i + 2);
    const next = i + 2 + length;
    if (next > bytes.length) {
      parts.push(bytes.subarray(i));
      return Buffer.concat(parts);
    }
    const isApp1 = marker === 0xe1;
    if (!isApp1) {
      parts.push(bytes.subarray(i, next));
    }
    i = next;
  }
  if (i < bytes.length) parts.push(bytes.subarray(i));
  return Buffer.concat(parts);
}

function stripPngExifChunk(bytes: Buffer): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!bytes.subarray(0, 8).equals(sig)) return bytes;
  const parts: Buffer[] = [bytes.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(i);
    const type = bytes.subarray(i + 4, i + 8).toString("ascii");
    const end = i + 12 + length;
    if (end > bytes.length) {
      parts.push(bytes.subarray(i));
      break;
    }
    if (type !== "eXIf") {
      parts.push(bytes.subarray(i, end));
    }
    i = end;
    if (type === "IEND") break;
  }
  return Buffer.concat(parts);
}

export function readDimensions(bytes: Buffer, mime: AcceptedMime): { width: number; height: number } | null {
  try {
    if (mime === "image/png") {
      if (bytes.length < 24) return null;
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    }
    if (mime === "image/jpeg") return jpegSize(bytes);
    if (mime === "image/webp") return webpSize(bytes);
  } catch {
    return null;
  }
  return null;
}

function jpegSize(bytes: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = bytes.readUInt16BE(i + 2);
    i += 2 + length;
  }
  return null;
}

function webpSize(bytes: Buffer): { width: number; height: number } | null {
  const chunk = bytes.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X" && bytes.length >= 30) {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { width, height };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    const start = 20;
    if (bytes[start + 3] === 0x9d && bytes[start + 4] === 0x01 && bytes[start + 5] === 0x2a) {
      return {
        width: bytes.readUInt16LE(start + 6) & 0x3fff,
        height: bytes.readUInt16LE(start + 8) & 0x3fff,
      };
    }
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b = bytes.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function validateUploadBytes(
  bytes: Buffer,
  declaredMime?: string,
): { error: string } | { mime: AcceptedMime; ext: string; bytes: Buffer; width: number | null; height: number | null } {
  if (bytes.length === 0) {
    return { error: "Choose a JPEG, PNG, or WebP image." };
  }
  if (bytes.length > IMAGE_MAX_BYTES) {
    return { error: SIZE_MESSAGE };
  }
  const declaredError = rejectDeclaredMime(declaredMime);
  if (declaredError) {
    return { error: declaredError };
  }
  const sniffed = sniffImage(bytes);
  if ("error" in sniffed) {
    return sniffed;
  }
  const stripped = stripGpsExif(bytes, sniffed.mime);
  const size = readDimensions(stripped, sniffed.mime);
  return {
    mime: sniffed.mime,
    ext: sniffed.ext,
    bytes: stripped,
    width: size?.width ?? null,
    height: size?.height ?? null,
  };
}
