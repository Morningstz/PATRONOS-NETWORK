import type { PrismaClient } from "@prisma/client";

/**
 * Deletes every DEMO-flagged record. Reference data (countries, regions, cities,
 * industries, ad placements) is kept. Order respects foreign keys.
 * Shared by the admin "Purge demo data" action and `npm run db:purge-demo`.
 */
export async function purgeDemoData(db: PrismaClient, opts: { keepUserId?: string } = {}) {
  return db.$transaction(async (tx) => {
    const campaigns = await tx.campaign.deleteMany({ where: { isDemo: true } });
    const collections = await tx.collection.deleteMany({ where: { isDemo: true } });
    const artworks = await tx.artwork.deleteMany({ where: { isDemo: true } });
    const artists = await tx.artist.deleteMany({ where: { isDemo: true } });
    const galleries = await tx.gallery.deleteMany({ where: { isDemo: true } });
    const acquisitions = await tx.acquisitionListing.deleteMany({ where: { isDemo: true } });
    const companies = await tx.company.deleteMany({ where: { isDemo: true } });
    const media = await tx.mediaAsset.deleteMany({ where: { isDemo: true } });
    const users = await tx.user.deleteMany({ where: { isDemo: true, ...(opts.keepUserId ? { id: { not: opts.keepUserId } } : {}) } });
    await tx.dataSource.deleteMany({ where: { kind: "DEMO", companies: { none: {} }, artists: { none: {} }, galleries: { none: {} }, artworks: { none: {} }, acquisitions: { none: {} } } });
    return {
      companies: companies.count,
      artists: artists.count,
      galleries: galleries.count,
      artworks: artworks.count,
      acquisitions: acquisitions.count,
      collections: collections.count,
      campaigns: campaigns.count,
      media: media.count,
      users: users.count,
    };
  }, { timeout: 60_000 });
}
