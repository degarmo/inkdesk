import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth";
import { contentDisposition, imageDownloadName, loginNextForImage, wantsDownload } from "@/lib/image-file";
import { absoluteStoragePath } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { isBrowserDocumentRequest } from "@/lib/utils";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const download = wantsDownload(request.url);
  const session = await getApiSession();
  if (!session) {
    if (isBrowserDocumentRequest(request)) {
      const next = loginNextForImage(id, download);
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
      kind: true,
      caption: true,
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
    const filename = imageDownloadName(image);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": contentDisposition(filename, download ? "attachment" : "inline"),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
}
