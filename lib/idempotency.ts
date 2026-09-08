import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function replayOrCreate(
  shopId: string,
  kind: string,
  key: string | null | undefined,
  create: (tx: Tx) => Promise<string>,
): Promise<{ id: string; replayed: boolean }> {
  const trimmed = key?.trim() ?? "";
  if (!trimmed) {
    const id = await prisma.$transaction((tx) => create(tx));
    return { id, replayed: false };
  }

  const existing = await prisma.idempotencyKey.findUnique({ where: { key: trimmed } });
  if (existing?.resultId) {
    return { id: existing.resultId, replayed: true };
  }

  try {
    const id = await prisma.$transaction(async (tx) => {
      const hit = await tx.idempotencyKey.findUnique({ where: { key: trimmed } });
      if (hit?.resultId) return hit.resultId;
      const createdId = await create(tx);
      await tx.idempotencyKey.create({
        data: { key: trimmed, shopId, kind, resultId: createdId },
      });
      return createdId;
    });
    return { id, replayed: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const hit = await prisma.idempotencyKey.findUnique({ where: { key: trimmed } });
      if (hit?.resultId) {
        return { id: hit.resultId, replayed: true };
      }
    }
    throw error;
  }
}
