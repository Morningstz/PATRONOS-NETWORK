import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { COLOR_FAMILIES, cosine } from "../art/color";
import { CATEGORIES } from "../art/generative";
import { artworkCardSelect, visibility } from "./public";

/** Art House browse filters — parsed from the URL, so every value is validated. */
export const artFilterSchema = z.object({
  category: z.enum(CATEGORIES).optional().catch(undefined),
  color: z.enum(COLOR_FAMILIES as unknown as [string, ...string[]]).optional().catch(undefined),
  mood: z.string().max(20).regex(/^[a-z-]+$/).optional().catch(undefined),
  availability: z.enum(["available", "all"]).optional().catch(undefined),
  price: z.enum(["u10", "10-25", "25-50", "o50"]).optional().catch(undefined),
  sort: z.enum(["newest", "price-asc", "price-desc", "year"]).optional().catch(undefined),
});
export type ArtFilters = z.infer<typeof artFilterSchema>;

export const PRICE_BANDS: Record<NonNullable<ArtFilters["price"]>, { label: string; min?: number; max?: number }> = {
  u10: { label: "Under Rp 10 juta", max: 10_000_000 },
  "10-25": { label: "Rp 10 – 25 juta", min: 10_000_000, max: 25_000_000 },
  "25-50": { label: "Rp 25 – 50 juta", min: 25_000_000, max: 50_000_000 },
  o50: { label: "Over Rp 50 juta", min: 50_000_000 },
};

export type ArtSearch = {
  categories?: string[];
  colorFamilies?: string[];
  moods?: string[];
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "year";
  take?: number;
};

export function filtersToSearch(f: ArtFilters): ArtSearch {
  const band = f.price ? PRICE_BANDS[f.price] : undefined;
  return {
    categories: f.category ? [f.category] : undefined,
    colorFamilies: f.color ? [f.color] : undefined,
    moods: f.mood ? [f.mood] : undefined,
    minPrice: band?.min,
    maxPrice: band?.max,
    availableOnly: f.availability === "available",
    sort: f.sort,
  };
}

export async function searchArtworks(q: ArtSearch) {
  const v = await visibility();
  const and: Prisma.ArtworkWhereInput[] = [{ ...v, artist: v }];
  if (q.categories?.length) and.push({ category: { in: q.categories } });
  if (q.colorFamilies?.length) and.push({ colorFamilies: { hasSome: q.colorFamilies } });
  if (q.moods?.length) and.push({ moods: { hasSome: q.moods } });
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    // Price filters only apply to works with a published IDR price
    and.push({
      availability: "AVAILABLE",
      priceCurrency: "IDR",
      priceAmount: { ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}), ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}) },
    });
  }
  if (q.availableOnly) and.push({ availability: { in: ["AVAILABLE", "ON_REQUEST"] } });
  const orderBy: Prisma.ArtworkOrderByWithRelationInput[] =
    q.sort === "price-asc"
      ? [{ priceAmount: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
      : q.sort === "price-desc"
        ? [{ priceAmount: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
        : q.sort === "year"
          ? [{ year: { sort: "desc", nulls: "last" } }]
          : [{ createdAt: "desc" }];
  return db.artwork.findMany({ where: { AND: and }, select: artworkCardSelect, orderBy, take: q.take ?? 60 });
}

/** Art Lens: closest works by colour signature (cosine similarity). The photo never reaches the server — only 15 numbers. */
export async function matchBySignature(signature: number[], take = 12) {
  const v = await visibility();
  const rows = await db.artwork.findMany({
    where: { ...v, artist: v, NOT: { colorSignature: { isEmpty: true } } },
    select: { ...artworkCardSelect, colorSignature: true },
    take: 1000,
  });
  return rows
    .map(({ colorSignature, ...a }) => ({ a, score: cosine(signature, colorSignature) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, take);
}

/** Discover Daily: a deterministic shuffle for the day, so everyone sees the same ten works today. */
export async function dailyPicks(day: string, take = 10) {
  const v = await visibility();
  const rows = await db.artwork.findMany({ where: { ...v, artist: v }, select: artworkCardSelect, orderBy: { id: "asc" }, take: 400 });
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const key = (id: string) => {
    let x = h;
    for (const ch of id) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
    return x >>> 0;
  };
  return rows.sort((a, b) => key(a.id) - key(b.id)).slice(0, take);
}

export async function savedArtworkIds(userId: string, ids?: string[]) {
  const rows = await db.savedArtwork.findMany({ where: { userId, ...(ids ? { artworkId: { in: ids } } : {}) }, select: { artworkId: true } });
  return new Set(rows.map((r) => r.artworkId));
}

export async function isFollowing(userId: string, artistId: string) {
  return !!(await db.followedArtist.findUnique({ where: { userId_artistId: { userId, artistId } }, select: { userId: true } }));
}

export async function listSaved(userId: string) {
  const v = await visibility();
  const rows = await db.savedArtwork.findMany({
    where: { userId, artwork: { ...v, artist: v } },
    orderBy: { createdAt: "desc" },
    select: { artwork: { select: artworkCardSelect } },
    take: 200,
  });
  return rows.map((r) => r.artwork);
}

export async function listFollowed(userId: string) {
  const v = await visibility();
  const rows = await db.followedArtist.findMany({
    where: { userId, artist: v },
    orderBy: { createdAt: "desc" },
    select: {
      artist: {
        select: { id: true, slug: true, name: true, discipline: true, portraitHue: true, isDemo: true, city: { select: { name: true } }, country: { select: { name: true } }, _count: { select: { artworks: true } } },
      },
    },
    take: 200,
  });
  return rows.map((r) => r.artist);
}
