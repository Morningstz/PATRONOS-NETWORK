import "server-only";
import { Prisma } from "@prisma/client";
import { connection } from "next/server";
import { db } from "../db";
import { showDemoData } from "../settings";
import type { CompanyFilters } from "../validation";

/**
 * PUBLIC query layer. Every query here:
 *  - uses an explicit `select` (no financials, claim evidence, private notes or emails)
 *  - hides REMOVED/HIDDEN records
 *  - hides DEMO records when the admin has switched demo data off
 */

export const PAGE_SIZE = 24;

export async function visibility() {
  await connection(); // public data reflects live moderation + demo settings; never prerender at build
  const showDemo = await showDemoData();
  return { status: "ACTIVE" as const, ...(showDemo ? {} : { isDemo: false }) };
}

export const companyCardSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  category: true,
  verificationStatus: true,
  verifiedAt: true,
  collaboration: true,
  logoHue: true,
  isDemo: true,
  createdAt: true,
  country: { select: { name: true, slug: true, iso2: true } },
  city: { select: { name: true, slug: true } },
  industry: { select: { name: true, slug: true } },
} satisfies Prisma.CompanySelect;

export type CompanyCard = Prisma.CompanyGetPayload<{ select: typeof companyCardSelect }>;

export const artistCardSelect = {
  id: true,
  slug: true,
  name: true,
  discipline: true,
  collaboration: true,
  verificationStatus: true,
  portraitHue: true,
  isDemo: true,
  country: { select: { name: true, slug: true } },
  city: { select: { name: true } },
} satisfies Prisma.ArtistSelect;

export type ArtistCard = Prisma.ArtistGetPayload<{ select: typeof artistCardSelect }>;

export const artworkCardSelect = {
  id: true,
  slug: true,
  title: true,
  year: true,
  medium: true,
  availability: true,
  aspectRatio: true,
  generativeSeed: true,
  isDemo: true,
  artist: { select: { name: true, slug: true } },
} satisfies Prisma.ArtworkSelect;

export type ArtworkCard = Prisma.ArtworkGetPayload<{ select: typeof artworkCardSelect }>;

// Financials live in AcquisitionFinancials and are deliberately absent here.
export const acquisitionCardSelect = {
  id: true,
  slug: true,
  headline: true,
  summary: true,
  status: true,
  isDemo: true,
  showRevenueRange: true,
  revenueRange: true,
  country: { select: { name: true, slug: true } },
  region: { select: { name: true } },
  industry: { select: { name: true, slug: true } },
} satisfies Prisma.AcquisitionListingSelect;

export type AcquisitionCard = Prisma.AcquisitionListingGetPayload<{ select: typeof acquisitionCardSelect }>;

/** Strips the revenue range unless the owner opted in. */
export function publicAcquisition<T extends { showRevenueRange: boolean; revenueRange: string | null }>(a: T): T {
  return a.showRevenueRange ? a : { ...a, revenueRange: null };
}

// ───────────────────────────── Companies ─────────────────────────────

export async function companyWhere(f: Partial<CompanyFilters>): Promise<Prisma.CompanyWhereInput> {
  const and: Prisma.CompanyWhereInput[] = [];
  const where: Prisma.CompanyWhereInput = { ...(await visibility()), deletedAt: null, AND: and };
  if (f.q) and.push({ OR: textMatch(f.q) });
  if (f.industry) and.push({ OR: industryMatch(f.industry) }); // includes sub-industries
  if (f.country) where.country = { slug: f.country };
  if (f.region) where.region = { slug: f.region, ...(f.country ? { country: { slug: f.country } } : {}) };
  if (f.city) where.city = { slug: f.city, ...(f.country ? { country: { slug: f.country } } : {}) };
  if (f.category) where.category = f.category;
  if (f.verification) where.verificationStatus = f.verification;
  if (f.collaboration) where.collaboration = f.collaboration;
  return where;
}

function textMatch(q: string): Prisma.CompanyWhereInput[] {
  return [
    { name: { contains: q, mode: "insensitive" } },
    { tagline: { contains: q, mode: "insensitive" } },
    { industry: { name: { contains: q, mode: "insensitive" } } },
    { city: { name: { contains: q, mode: "insensitive" } } },
  ];
}

function industryMatch(slug: string): Prisma.CompanyWhereInput[] {
  return [{ industry: { slug } }, { industry: { parent: { slug } } }];
}

export async function listCompanies(f: CompanyFilters) {
  const where = await companyWhere(f);
  const orderBy: Prisma.CompanyOrderByWithRelationInput[] =
    f.sort === "name" ? [{ name: "asc" }] : [{ createdAt: "desc" }, { name: "asc" }];
  const [total, items] = await db.$transaction([
    db.company.count({ where }),
    db.company.findMany({ where, orderBy, select: companyCardSelect, take: PAGE_SIZE, skip: (f.page - 1) * PAGE_SIZE }),
  ]);
  return { total, items, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getCompany(slug: string) {
  const v = await visibility();
  return db.company.findFirst({
    where: { slug, deletedAt: null, ...v },
    select: {
      ...companyCardSelect,
      description: true,
      website: true,
      foundedYear: true,
      employeeRange: true,
      updatedAt: true,
      region: { select: { name: true, slug: true } },
      tags: { select: { tag: { select: { name: true, slug: true } } } },
      dataSource: { select: { name: true, kind: true } },
      acquisitions: { where: { status: "PUBLISHED" }, select: acquisitionCardSelect, take: 1 },
      _count: { select: { members: true } },
    },
  });
}

export async function relatedCompanies(companyId: string, industrySlug: string, countrySlug: string) {
  const v = await visibility();
  return db.company.findMany({
    where: {
      ...v,
      deletedAt: null,
      id: { not: companyId },
      OR: [{ industry: { slug: industrySlug } }, { country: { slug: countrySlug } }],
    },
    select: companyCardSelect,
    take: 8,
    orderBy: { createdAt: "desc" },
  });
}

// ─────────────────────────── Geography ───────────────────────────

export async function countriesWithCounts() {
  const v = await visibility();
  return db.country.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      iso2: true,
      macroRegion: true,
      _count: { select: { companies: { where: { ...v, deletedAt: null } }, artists: { where: v } } },
    },
  });
}

export async function getCountry(slug: string) {
  return db.country.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      iso2: true,
      macroRegion: true,
      regions: { orderBy: { name: "asc" }, select: { name: true, slug: true } },
      cities: { orderBy: { name: "asc" }, select: { name: true, slug: true, region: { select: { slug: true } } } },
    },
  });
}

export async function industriesTree() {
  const v = await visibility();
  return db.industry.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: { select: { companies: { where: { ...v, deletedAt: null } } } },
      children: {
        orderBy: { name: "asc" },
        select: { name: true, slug: true, _count: { select: { companies: { where: { ...v, deletedAt: null } } } } },
      },
    },
  });
}

export async function getIndustry(slug: string) {
  return db.industry.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      description: true,
      parent: { select: { name: true, slug: true } },
      children: { select: { name: true, slug: true } },
    },
  });
}

export async function filterOptions() {
  const [countries, industries] = await Promise.all([
    db.country.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    db.industry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, parentId: true } }),
  ]);
  return { countries, industries };
}

// ─────────────────────────── Creative ───────────────────────────

export async function listArtists(take = 48) {
  const v = await visibility();
  return db.artist.findMany({ where: v, select: artistCardSelect, orderBy: { name: "asc" }, take });
}

export async function getArtist(slug: string) {
  const v = await visibility();
  return db.artist.findFirst({
    where: { slug, ...v },
    select: {
      ...artistCardSelect,
      bio: true,
      artworks: { where: v, select: artworkCardSelect, orderBy: { year: "desc" } },
      galleries: { select: { gallery: { select: { name: true, slug: true } } } },
      collections: { select: { slug: true, title: true, _count: { select: { items: true } } } },
    },
  });
}

export async function listArtworks(take = 60) {
  const v = await visibility();
  return db.artwork.findMany({ where: { ...v, artist: v }, select: artworkCardSelect, orderBy: { createdAt: "desc" }, take });
}

export async function getArtwork(slug: string) {
  const v = await visibility();
  return db.artwork.findFirst({
    where: { slug, ...v, artist: v },
    select: {
      ...artworkCardSelect,
      dimensions: true,
      editionSize: true,
      editionNumber: true,
      description: true,
      priceAmount: true,
      priceCurrency: true,
      artist: { select: { id: true, name: true, slug: true, discipline: true, city: { select: { name: true } }, country: { select: { name: true } } } },
      gallery: { select: { name: true, slug: true } },
      provenance: { orderBy: { occurredOn: "asc" }, select: { id: true, kind: true, occurredOn: true, description: true, source: true } },
    },
  });
}

export async function moreFromArtist(artistSlug: string, excludeId: string) {
  const v = await visibility();
  return db.artwork.findMany({
    where: { ...v, id: { not: excludeId }, artist: { slug: artistSlug } },
    select: artworkCardSelect,
    take: 8,
  });
}

export async function listGalleries(take = 12) {
  const v = await visibility();
  return db.gallery.findMany({
    where: v,
    take,
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      verificationStatus: true,
      isDemo: true,
      city: { select: { name: true } },
      country: { select: { name: true } },
      _count: { select: { artists: true, artworks: true } },
    },
  });
}

export async function listAcquisitions(take = 24) {
  const v = await visibility();
  const rows = await db.acquisitionListing.findMany({
    where: { status: "PUBLISHED", ...(v.isDemo === false ? { isDemo: false } : {}) },
    select: acquisitionCardSelect,
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(publicAcquisition);
}

export async function getAcquisition(slug: string) {
  const v = await visibility();
  const row = await db.acquisitionListing.findFirst({
    where: { slug, status: "PUBLISHED", ...(v.isDemo === false ? { isDemo: false } : {}) },
    select: { ...acquisitionCardSelect, reasonForSale: true, createdAt: true, company: { select: { name: true, slug: true } } },
  });
  return row ? publicAcquisition(row) : null;
}

// ─────────────────────────── Advertising ───────────────────────────

export async function activePlacements() {
  return db.adPlacement.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } });
}

/** Live sponsored ads for a placement. Always rendered with the SPONSORED label. */
export async function liveSponsored(location: "HOMEPAGE_SHELF" | "DIRECTORY_SPOTLIGHT" | "COUNTRY_FEATURE", take = 2) {
  const now = new Date();
  const showDemo = await showDemoData();
  return db.advertisement.findMany({
    where: {
      reviewStatus: "APPROVED",
      campaign: {
        status: "LIVE",
        startsAt: { lte: now },
        endsAt: { gte: now },
        placement: { location },
        ...(showDemo ? {} : { isDemo: false }),
      },
    },
    take,
    select: {
      id: true,
      headline: true,
      body: true,
      targetUrl: true,
      campaign: { select: { isDemo: true } },
      targetCompany: { select: companyCardSelect },
    },
  });
}

export async function upcomingSpotlights(take = 6) {
  const showDemo = await showDemoData();
  return db.campaign.findMany({
    where: { status: { in: ["APPROVED", "LIVE"] }, endsAt: { gte: new Date() }, ...(showDemo ? {} : { isDemo: false }) },
    orderBy: { startsAt: "asc" },
    take,
    select: {
      id: true,
      name: true,
      startsAt: true,
      isDemo: true,
      placement: { select: { name: true } },
      company: { select: { name: true, slug: true } },
    },
  });
}

/** Latest REAL (non-demo) verification event for the Live pill. */
export async function latestLiveEvent() {
  return db.company.findFirst({
    where: { isDemo: false, status: "ACTIVE", verificationStatus: "VERIFIED", verifiedAt: { not: null } },
    orderBy: { verifiedAt: "desc" },
    select: { name: true, city: { select: { name: true } }, country: { select: { name: true } } },
  });
}
