import { ACCEPTED_MIME, type AcceptedMime } from "./images-mime";

const EMPTY_FILE_MESSAGE = "Choose a JPEG, PNG, or WebP image.";

export type UploadFile = {
  type?: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

/** Accept File, Blob, or Next/undici File-like parts — `instanceof File` is not reliable in server actions. */
export function asUploadFile(value: unknown): UploadFile | { error: string } {
  if (value == null || typeof value === "string") {
    return { error: EMPTY_FILE_MESSAGE };
  }
  const candidate = value as { size?: unknown; type?: unknown; arrayBuffer?: unknown };
  if (typeof candidate.arrayBuffer !== "function") {
    return { error: EMPTY_FILE_MESSAGE };
  }
  const read = candidate.arrayBuffer as () => Promise<ArrayBuffer>;
  const size = typeof candidate.size === "number" ? candidate.size : NaN;
  if (!Number.isFinite(size) || size <= 0) {
    return { error: EMPTY_FILE_MESSAGE };
  }
  return {
    type: typeof candidate.type === "string" ? candidate.type : undefined,
    size,
    arrayBuffer: () => read(),
  };
}

export function wantsDownload(requestUrl: string) {
  try {
    return new URL(requestUrl).searchParams.get("download") === "1";
  } catch {
    return false;
  }
}

export function loginNextForImage(id: string, download: boolean) {
  return download ? `/api/images/${id}?download=1` : `/api/images/${id}`;
}

function extensionFor(mimeType: string, storageKey?: string) {
  if (mimeType in ACCEPTED_MIME) {
    return ACCEPTED_MIME[mimeType as AcceptedMime];
  }
  const fromKey = storageKey?.split(".").pop()?.toLowerCase() ?? "";
  if (fromKey === "jpg" || fromKey === "jpeg" || fromKey === "png" || fromKey === "webp") {
    return fromKey === "jpeg" ? "jpg" : fromKey;
  }
  return "img";
}

function slugFileBase(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "reference";
}

export function imageDownloadName(image: {
  id: string;
  kind: string;
  caption: string;
  mimeType: string;
  storageKey?: string;
}) {
  const ext = extensionFor(image.mimeType, image.storageKey);
  const base = slugFileBase(image.caption || image.kind);
  const shortId = image.id.replace(/-/g, "").slice(0, 8);
  return `${base}-${shortId}.${ext}`;
}

/** RFC 6266 / 5987 so a Download control gets a parlor-readable filename. */
export function contentDisposition(filename: string, mode: "inline" | "attachment") {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
