import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth";
import { absoluteStoragePath } from "@/lib/paths";
import { imageContentHeaders, imageDownloadFilename, wantsImageDownload } from "@/lib/image-store";
import { prisma } from "@/lib/prisma";
import { isBrowserDocumentRequest } from "@/lib/utils";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const download = wantsImageDownload(request);
  const session = await getApiSession();
  if (!session) {
    if (isBrowserDocumentRequest(request)) {
      const next = download ? `/api/images/${id}?download=1` : `/api/images/${id}`;
      return new NextResponse(null, {
        status: 303,
        headers: { Location: `/login?next=${encodeURIComponent(next)}` },
      });
    }
    return new NextResponse("Sign in to view parlor images.", { status: 401 });
  }

  const image = await prisma.clientImage.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      shopId: true,
      storageKey: true,
      mimeType: true,
      byteSize: true,
      caption: true,
      kind: true,
    },
  });
  if (!image) {
    return new NextResponse("Not found.", { status: 404 });
  }
  if (image.shopId !== session.shopId) {
    return new NextResponse("Forbidden.", { status: 403 });
  }

  try {
    const bytes = await readFile(absoluteStoragePath(image.storageKey));
    const filename = imageDownloadFilename(image);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: imageContentHeaders({
        mimeType: image.mimeType,
        byteLength: bytes.length,
        filename,
        download,
      }),
    });
  } catch {
    return new NextResponse("Photo file is missing from parlor storage.", { status: 404 });
  }
}
