export const ACCEPTED_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AcceptedMime = keyof typeof ACCEPTED_MIME;
