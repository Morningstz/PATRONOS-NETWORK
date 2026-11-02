"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz";
import { hashIdentifier } from "@/lib/hash";
import { LIMITS, rateLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { matchBySignature } from "@/lib/queries/art";
import { visibility } from "@/lib/queries/public";

export type ToggleResult = { ok: true; on: boolean } | { ok: false; error: string; needsSignIn?: boolean };

const toggleSchema = z.object({ id: z.string().uuid(), on: z.boolean() });

async function guard(): Promise<{ userId: string } | ToggleResult> {
  const user = await getSessionUser();
  if (!user || !can(user, "collection:manage")) return { ok: false, error: "Sign in to save works and follow artists.", needsSignIn: true };
  const rl = await rateLimiter().limit(`collect:${user.id}`, LIMITS.collect.max, LIMITS.collect.windowMs);
  if (!rl.ok) return { ok: false, error: "Slow down a little — try again in a minute." };
  return { userId: user.id };
}

export async function setSaved(artworkId: string, on: boolean): Promise<ToggleResult> {
  const parsed = toggleSchema.safeParse({ id: artworkId, on });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const g = await guard();
  if (!("userId" in g)) return g;
  const v = await visibility();
  const exists = await db.artwork.findFirst({ where: { id: parsed.data.id, ...v, artist: v }, select: { slug: true } });
  if (!exists) return { ok: false, error: "That work is no longer available." };
  if (parsed.data.on) {
    await db.savedArtwork.upsert({ where: { userId_artworkId: { userId: g.userId, artworkId: parsed.data.id } }, create: { userId: g.userId, artworkId: parsed.data.id }, update: {} });
  } else {
    await db.savedArtwork.deleteMany({ where: { userId: g.userId, artworkId: parsed.data.id } });
  }
  revalidatePath("/saved");
  return { ok: true, on: parsed.data.on };
}

export async function setFollowed(artistId: string, on: boolean): Promise<ToggleResult> {
  const parsed = toggleSchema.safeParse({ id: artistId, on });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const g = await guard();
  if (!("userId" in g)) return g;
  const v = await visibility();
  const exists = await db.artist.findFirst({ where: { id: parsed.data.id, ...v }, select: { slug: true } });
  if (!exists) return { ok: false, error: "That artist is no longer listed." };
  if (parsed.data.on) {
    await db.followedArtist.upsert({ where: { userId_artistId: { userId: g.userId, artistId: parsed.data.id } }, create: { userId: g.userId, artistId: parsed.data.id }, update: {} });
  } else {
    await db.followedArtist.deleteMany({ where: { userId: g.userId, artistId: parsed.data.id } });
  }
  revalidatePath("/saved");
  return { ok: true, on: parsed.data.on };
}

const signatureSchema = z.array(z.number().finite().min(0).max(1)).length(15);

/** Art Lens: receives only a 15-number colour signature computed in the browser — never the photo. */
export async function lensMatch(signature: number[]) {
  const parsed = signatureSchema.safeParse(signature);
  if (!parsed.success) return { ok: false as const, error: "Could not read the colours of that image." };
  const ip = await clientIp();
  const rl = await rateLimiter().limit(`lens:${hashIdentifier(ip)}`, LIMITS.lens.max, LIMITS.lens.windowMs);
  if (!rl.ok) return { ok: false as const, error: "Too many searches — try again in a minute." };
  const matches = await matchBySignature(parsed.data, 12);
  return {
    ok: true as const,
    matches: matches.map(({ a, score }) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      year: a.year,
      artist: a.artist.name,
      seed: a.generativeSeed ?? 1,
      ratio: a.aspectRatio,
      isDemo: a.isDemo,
      availability: a.availability,
      price: a.availability === "AVAILABLE" && a.priceAmount && a.priceCurrency ? { amount: Number(a.priceAmount), currency: a.priceCurrency } : null,
      score: Math.round(score * 100),
    })),
  };
}
