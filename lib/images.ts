import {
  IMAGE_MAX_PER_APPOINTMENT,
  IMAGE_MAX_PER_CLIENT,
} from "./constants";
import { prisma } from "./prisma";
import type { ImageRecord } from "./image-types";
import { storageRoot } from "./paths";

export type { ImageRecord };
export { absoluteStoragePath, storageKeyFor, storageRoot } from "./paths";
export { publicImagePath } from "./utils";
export {
  ACCEPTED_MIME,
  extensionForImage,
  imageContentHeaders,
  imageDownloadFilename,
  isImageKind,
  readFormUpload,
  readShopImage,
  rejectDeclaredMime,
  sniffImage,
  validateUploadBytes,
  wantsImageDownload,
  writeShopImage,
  type AcceptedMime,
} from "./image-store";

/** Resolved at call time — do not cache this at import (Render STORAGE_ROOT must win). */
export function currentStorageRoot() {
  return storageRoot();
}

export async function countLiveClientImages(shopId: string, clientId: string) {
  return prisma.clientImage.count({
    where: { shopId, clientId, deletedAt: null },
  });
}

export async function countLiveAppointmentImages(shopId: string, appointmentId: string) {
  return prisma.clientImage.count({
    where: { shopId, appointmentId, deletedAt: null },
  });
}

export async function assertClientCap(shopId: string, clientId: string) {
  const count = await countLiveClientImages(shopId, clientId);
  if (count >= IMAGE_MAX_PER_CLIENT) {
    return `This client already has ${IMAGE_MAX_PER_CLIENT} images.`;
  }
  return null;
}

export async function assertAppointmentCap(shopId: string, appointmentId: string) {
  const count = await countLiveAppointmentImages(shopId, appointmentId);
  if (count >= IMAGE_MAX_PER_APPOINTMENT) {
    return `This booking already has ${IMAGE_MAX_PER_APPOINTMENT} images.`;
  }
  return null;
}

export async function listClientImages(shopId: string, clientId: string): Promise<ImageRecord[]> {
  return prisma.clientImage.findMany({
    where: { shopId, clientId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientId: true,
      appointmentId: true,
      kind: true,
      prepForVisit: true,
      caption: true,
      mimeType: true,
      byteSize: true,
      width: true,
      height: true,
      createdAt: true,
    },
  });
}

export async function listAppointmentImages(shopId: string, appointmentId: string): Promise<ImageRecord[]> {
  return prisma.clientImage.findMany({
    where: { shopId, appointmentId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientId: true,
      appointmentId: true,
      kind: true,
      prepForVisit: true,
      caption: true,
      mimeType: true,
      byteSize: true,
      width: true,
      height: true,
      createdAt: true,
    },
  });
}

export async function prepReadyIds(shopId: string, appointmentIds: string[], clientIds: string[]) {
  if (appointmentIds.length === 0 && clientIds.length === 0) {
    return { appointmentIds: new Set<string>(), clientIds: new Set<string>() };
  }
  const rows = await prisma.clientImage.findMany({
    where: {
      shopId,
      deletedAt: null,
      prepForVisit: true,
      OR: [
        ...(appointmentIds.length ? [{ appointmentId: { in: appointmentIds } }] : []),
        ...(clientIds.length ? [{ clientId: { in: clientIds } }] : []),
      ],
    },
    select: { appointmentId: true, clientId: true },
  });
  return {
    appointmentIds: new Set(rows.map((row) => row.appointmentId).filter((id): id is string => Boolean(id))),
    clientIds: new Set(rows.map((row) => row.clientId)),
  };
}

export function appointmentHasPrep(
  appointmentId: string,
  clientId: string,
  prep: { appointmentIds: Set<string>; clientIds: Set<string> },
) {
  return prep.appointmentIds.has(appointmentId) || prep.clientIds.has(clientId);
}
