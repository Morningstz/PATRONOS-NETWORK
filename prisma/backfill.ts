/**
 * Idempotent data backfill for databases seeded before the Art House release:
 *  - discovery traits (category, colour families, moods, colour signature) for generative works
 *  - demo artwork prices moved to IDR (the Art House sells in rupiah)
 * Only touches rows that are missing the data, so it is safe to run on every deploy.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { DISCIPLINE_CATEGORY, traitsForSeed } from "../src/lib/art/generative";

export function demoPriceIdr(seed: number): number {
  return 8_000_000 + ((seed * 7919) % 59) * 1_500_000;
}

export async function backfillArtworkData(db: PrismaClient) {
  const rows = await db.artwork.findMany({
    where: {
      generativeSeed: { not: null },
      OR: [{ category: null }, { colorSignature: { isEmpty: true } }, { isDemo: true, priceCurrency: "USD" }],
    },
    select: { id: true, generativeSeed: true, priceAmount: true, priceCurrency: true, isDemo: true, artist: { select: { discipline: true } } },
  });
  if (rows.length === 0) return 0;
  await db.$transaction(
    rows.map((a) => {
      const t = traitsForSeed(a.generativeSeed!);
      const toIdr = a.isDemo && a.priceCurrency === "USD" && a.priceAmount !== null;
      return db.artwork.update({
        where: { id: a.id },
        data: {
          category: DISCIPLINE_CATEGORY[a.artist.discipline] ?? "Mixed media",
          colorFamilies: t.colorFamilies,
          moods: t.moods,
          colorSignature: t.signature,
          ...(toIdr ? { priceAmount: new Prisma.Decimal(demoPriceIdr(a.generativeSeed!)), priceCurrency: "IDR" } : {}),
        },
      });
    }),
  );
  return rows.length;
}
