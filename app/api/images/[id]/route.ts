import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth";
import { absoluteStoragePath } from "@/lib/images";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) {
    return new NextResponse("Sign in to view parlor images.", { status: 401 });
  }

  const { id } = await params;
  const image = await prisma.clientImage.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, shopId: true, storageKey: true, mimeType: true, byteSize: true },
  });
  if (!image) {
    return new NextResponse("Not found.", { status: 404 });
  }
  if (image.shopId !== session.shopId) {
    return new NextResponse("Forbidden.", { status: 403 });
  }

  try {
    const bytes = await readFile(absoluteStoragePath(image.storageKey));
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
}
