import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { hashIdentifier } from "./hash";
import { clientIp } from "./request";

type Tx = Prisma.TransactionClient;

export async function writeAudit(
  entry: { actorId: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Prisma.InputJsonValue },
  tx: Tx = db,
) {
  const ip = await clientIp().catch(() => null);
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? undefined,
      ipHash: ip ? hashIdentifier(ip) : null,
    },
  });
}
