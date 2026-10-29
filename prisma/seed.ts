/**
 * Seeds reference data (geography, industries, ad placements) and clearly-labeled DEMO data.
 *
 * Built for high-latency links (e.g. a US build machine → Singapore database): every table
 * is written with a handful of bulk `createMany` calls (~30 round trips total) instead of
 * hundreds of per-row writes. IDs are generated client-side so relations can be bulk-inserted.
 *
 *   npm run db:seed                 → upsert reference data, purge + recreate demo data
 *   tsx prisma/seed.ts --if-empty   → only seed when demo seeding has never completed
 *                                     (used by the Vercel build; never touches real data)
 */
import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { purgeDemoData } from "../src/lib/demo";
import { ACQUISITIONS, ARTISTS, ARTWORK_TITLES, COMPANIES, COUNTRIES, DEMO_USERS, GALLERIES, INDUSTRIES, MEDIUMS, PLACEMENTS } from "./seed-data";

const db = new PrismaClient();
const SEED_MARKER = "demoSeedCompletedAt";
const DAY = 86_400_000;
const t0 = Date.now();
const log = (msg: string) => console.log(`[seed +${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

const cityName = (country: string, city: string) =>
  COUNTRIES.find((c) => c.slug === country)?.regions.flatMap((r) => r.cities).find(([, slug]) => slug === city)?.[0] ?? city;

// ───────────────────────── Reference data (idempotent) ─────────────────────────
async function seedReference() {
  await db.country.createMany({ data: COUNTRIES.map((c) => ({ name: c.name, slug: c.slug, iso2: c.iso2, macroRegion: c.macro })), skipDuplicates: true });
  const countries = new Map((await db.country.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));

  await db.region.createMany({
    data: COUNTRIES.flatMap((c) => c.regions.map((r) => ({ countryId: countries.get(c.slug)!, name: r.name, slug: r.slug }))),
    skipDuplicates: true,
  });
  const regions = await db.region.findMany({ select: { id: true, slug: true, countryId: true } });
  const regionId = (countryId: string, slug: string) => regions.find((r) => r.countryId === countryId && r.slug === slug)!.id;

  await db.city.createMany({
    data: COUNTRIES.flatMap((c) => {
      const countryId = countries.get(c.slug)!;
      return c.regions.flatMap((r) => r.cities.map(([name, slug]) => ({ countryId, regionId: regionId(countryId, r.slug), name, slug })));
    }),
    skipDuplicates: true,
  });

  await db.industry.createMany({ data: INDUSTRIES.map((i) => ({ name: i.name, slug: i.slug, description: i.description })), skipDuplicates: true });
  const parents = new Map((await db.industry.findMany({ where: { parentId: null }, select: { id: true, slug: true } })).map((i) => [i.slug, i.id]));
  await db.industry.createMany({
    data: INDUSTRIES.flatMap((p) => p.children.map(([name, slug]) => ({ name, slug, parentId: parents.get(p.slug)! }))),
    skipDuplicates: true,
  });

  await db.adPlacement.createMany({ data: PLACEMENTS.map((p) => ({ ...p })), skipDuplicates: true });
  log("reference data ready");
}

// ───────────────────────────── Demo data (bulk) ─────────────────────────────
async function seedDemo() {
  const now = Date.now();
  const r = rng(20261029);

  const source = await db.dataSource.upsert({
    where: { name: "PATRONOS Demo Seed" },
    update: {},
    create: { name: "PATRONOS Demo Seed", kind: "DEMO", notes: "Fictional sample data for demonstration. Not real organisations or people." },
  });

  const [countryRows, cityRows, industryRows, regionRows, placementRows] = await Promise.all([
    db.country.findMany({ select: { id: true, slug: true } }),
    db.city.findMany({ select: { id: true, slug: true, countryId: true, regionId: true } }),
    db.industry.findMany({ select: { id: true, slug: true } }),
    db.region.findMany({ select: { id: true, slug: true, countryId: true } }),
    db.adPlacement.findMany({ select: { id: true, key: true, priceCents: true } }),
  ]);
  const countries = new Map(countryRows.map((c) => [c.slug, c.id]));
  const industries = new Map(industryRows.map((i) => [i.slug, i.id]));
  const placements = new Map(placementRows.map((p) => [p.key, p]));
  const loc = (country: string, city: string) => {
    const countryId = countries.get(country)!;
    const ci = cityRows.find((x) => x.countryId === countryId && x.slug === city);
    if (!ci) throw new Error(`Unknown city ${country}/${city}`);
    return { countryId, cityId: ci.id, regionId: ci.regionId };
  };

  // Users, profiles, roles
  const users = new Map(DEMO_USERS.map((u) => [u.email, randomUUID()]));
  await db.user.createMany({ data: DEMO_USERS.map((u) => ({ id: users.get(u.email)!, email: u.email, isDemo: true })) });
  await db.profile.createMany({ data: DEMO_USERS.map((u) => ({ userId: users.get(u.email)!, displayName: u.name })) });
  await db.userRole.createMany({ data: DEMO_USERS.flatMap((u) => u.roles.map((role) => ({ userId: users.get(u.email)!, role }))) });
  log(`users: ${DEMO_USERS.length}`);

  // Companies (never VERIFIED — demo records cannot be verified). Company 0 is managed by the demo owner.
  const companyIds = COMPANIES.map(() => randomUUID());
  await db.company.createMany({
    data: COMPANIES.map(([name, industry, country, city, category, collab, founded, employees, tagline], i) => ({
      id: companyIds[i]!,
      slug: slugify(name),
      name,
      tagline,
      description: `${name} is a fictional ${category === "CREATIVE_STUDIO" ? "creative studio" : "company"} created for the PATRONOS demo. ${tagline} This profile illustrates how verified businesses present their story, collaborations and services on PATRONOS.`,
      foundedYear: founded,
      employeeRange: employees,
      category,
      collaboration: collab,
      ...loc(country, city),
      industryId: industries.get(industry)!,
      verificationStatus: i === 0 ? ("CLAIMED" as const) : ("UNVERIFIED" as const),
      logoHue: Math.floor(r() * 21),
      isDemo: true,
      dataSourceId: source.id,
      createdAt: new Date(now - (COMPANIES.length - i) * DAY * 2),
    })),
  });
  await db.companyMember.create({ data: { companyId: companyIds[0]!, userId: users.get("owner@demo.patronos.local")!, role: "OWNER" } });
  log(`companies: ${COMPANIES.length}`);

  // Artists
  const artistIds = ARTISTS.map(() => randomUUID());
  await db.artist.createMany({
    data: ARTISTS.map(([name, discipline, country, city, collab, bio, hue], i) => {
      const l = loc(country, city);
      return {
        id: artistIds[i]!,
        slug: slugify(name),
        name,
        discipline,
        bio: `${bio} (Fictional demo artist.)`,
        countryId: l.countryId,
        cityId: l.cityId,
        collaboration: collab,
        portraitHue: hue,
        isDemo: true,
        dataSourceId: source.id,
        userId: i === 0 ? users.get("artist@demo.patronos.local") : undefined,
        createdAt: new Date(now - (ARTISTS.length - i) * DAY),
      };
    }),
  });

  // Galleries + representation
  const galleryIds = GALLERIES.map(() => randomUUID());
  await db.gallery.createMany({
    data: GALLERIES.map(([name, country, city, description], i) => {
      const l = loc(country, city);
      return { id: galleryIds[i]!, slug: slugify(name), name, description: `${description} (Fictional demo gallery.)`, countryId: l.countryId, cityId: l.cityId, isDemo: true, dataSourceId: source.id };
    }),
  });
  await db.galleryArtist.createMany({ data: GALLERIES.flatMap((g, gi) => g[4].map((ai) => ({ galleryId: galleryIds[gi]!, artistId: artistIds[ai]! }))) });
  log(`artists: ${ARTISTS.length}, galleries: ${GALLERIES.length}`);

  // Artworks — 3 per artist, generated imagery, true aspect ratios
  const ratios = [0.75, 0.8, 1, 1.25, 1.5, 0.66, 1.33];
  const avail = ["AVAILABLE", "ON_REQUEST", "ON_REQUEST", "SOLD", "AVAILABLE", "NOT_FOR_SALE"] as const;
  const artworks: Prisma.ArtworkCreateManyInput[] = [];
  const provenance: Prisma.ProvenanceEventCreateManyInput[] = [];
  const collections: Prisma.CollectionCreateManyInput[] = [];
  const collectionItems: Prisma.CollectionItemCreateManyInput[] = [];
  let t = 0;
  for (const [ai, a] of ARTISTS.entries()) {
    const media = MEDIUMS[a[1]] ?? ["Mixed media"];
    const gallery = GALLERIES.findIndex((g) => g[4].includes(ai));
    const collectionId = randomUUID();
    collections.push({ id: collectionId, slug: `${slugify(a[0])}-selected-works`, title: "Selected works", artistId: artistIds[ai]!, isDemo: true });
    for (let k = 0; k < 3; k++) {
      const id = randomUUID();
      const title = ARTWORK_TITLES[t % ARTWORK_TITLES.length]!;
      const availability = avail[(t + k) % avail.length]!;
      const year = 2019 + ((t * 3) % 7);
      const ratio = ratios[(t * 5 + k) % ratios.length]!;
      const priced = availability === "AVAILABLE";
      const editioned = a[1] === "Printmaker" || a[1] === "Photographer";
      artworks.push({
        id,
        slug: slugify(`${title}-${a[0]}`),
        title,
        artistId: artistIds[ai]!,
        galleryId: gallery >= 0 ? galleryIds[gallery] : undefined,
        year,
        medium: media[k % media.length]!,
        dimensions: ratio >= 1 ? `${Math.round(80 * ratio)} × 80 cm` : `80 × ${Math.round(80 / ratio)} cm`,
        editionSize: editioned ? 10 : null,
        editionNumber: editioned ? 1 + k : null,
        availability,
        priceAmount: priced ? new Prisma.Decimal(1200 + Math.round(r() * 18) * 400) : null,
        priceCurrency: priced ? "USD" : null,
        description: `A fictional demo work by ${a[0]}, rendered by PATRONOS's generative placeholder engine so the demo needs no third-party imagery.`,
        aspectRatio: ratio,
        generativeSeed: 101 + t * 7,
        isDemo: true,
        dataSourceId: source.id,
        createdAt: new Date(now - (36 - t) * DAY * 0.5),
      });
      provenance.push({ artworkId: id, kind: "CREATED", occurredOn: new Date(`${year}-03-01`), description: `Created in the artist's studio in ${cityName(a[2], a[3])}`, source: "Artist statement (demo)" });
      if (gallery >= 0) provenance.push({ artworkId: id, kind: "EXHIBITED", occurredOn: new Date(`${Math.min(year + 1, 2026)}-06-15`), description: `Exhibited at ${GALLERIES[gallery]![0]}`, source: "Gallery records (demo)" });
      provenance.push({ artworkId: id, kind: "LISTED", occurredOn: new Date(now - (40 - t) * DAY), description: "Listed on PATRONOS", source: "PATRONOS" });
      collectionItems.push({ collectionId, artworkId: id, position: k });
      t++;
    }
  }
  await db.artwork.createMany({ data: artworks });
  await db.provenanceEvent.createMany({ data: provenance });
  await db.collection.createMany({ data: collections });
  await db.collectionItem.createMany({ data: collectionItems });
  log(`artworks: ${artworks.length}`);

  // Acquisitions (private financials stored separately)
  const acquisitionIds = ACQUISITIONS.map(() => randomUUID());
  await db.acquisitionListing.createMany({
    data: ACQUISITIONS.map((a, i) => {
      const countryId = countries.get(a.country)!;
      return {
        id: acquisitionIds[i]!,
        slug: a.slug,
        companyId: a.companyIdx !== null ? companyIds[a.companyIdx] : undefined,
        headline: a.headline,
        summary: `${a.summary} (Fictional demo listing.)`,
        industryId: industries.get(a.industry)!,
        countryId,
        regionId: a.region ? regionRows.find((x) => x.countryId === countryId && x.slug === a.region)?.id : undefined,
        revenueRange: a.revenueRange,
        showRevenueRange: a.show,
        reasonForSale: a.reason,
        status: "PUBLISHED" as const,
        isDemo: true,
        dataSourceId: source.id,
        createdAt: new Date(now - (6 - i) * DAY * 3),
      };
    }),
  });
  await db.acquisitionFinancials.createMany({
    data: ACQUISITIONS.map((a, i) => ({ listingId: acquisitionIds[i]!, currency: a.fin[0], askingPrice: a.fin[1], annualRevenue: a.fin[2], ebitda: a.fin[3] })),
  });
  log(`acquisitions: ${ACQUISITIONS.length}`);

  // Sponsored campaigns (demo) — always labeled SPONSORED in the UI
  const owner = users.get("owner@demo.patronos.local")!;
  const admin = users.get("admin@demo.patronos.local")!;
  const campaigns = [
    { name: "Ambrevale — Harvest season", placement: "homepage-shelf", company: 0, status: "LIVE" as const, start: -3, end: 11, headline: "Smart irrigation, now in 40 villages", body: "See how East Java growers cut water use this season." },
    { name: "Nethrin — Batik for brands", placement: "homepage-shelf", company: 3, status: "LIVE" as const, start: -1, end: 13, headline: "Commission contemporary batik", body: "Limited collaboration slots for 2027 collections." },
    { name: "Marrowind — Identity clinic", placement: "directory-spotlight", company: 9, status: "APPROVED" as const, start: 5, end: 19, headline: "Identity systems for museums", body: null },
    { name: "Tessaveil — Residency open call", placement: "country-feature", company: 4, status: "APPROVED" as const, start: 12, end: 26, headline: "Craft residency open call", body: null },
  ].map((c) => ({ ...c, id: randomUUID() }));
  await db.campaign.createMany({
    data: campaigns.map((c) => {
      const p = placements.get(c.placement)!;
      return {
        id: c.id,
        name: c.name,
        advertiserId: owner,
        companyId: companyIds[c.company]!,
        placementId: p.id,
        status: c.status,
        startsAt: new Date(now + c.start * DAY),
        endsAt: new Date(now + c.end * DAY),
        priceCents: p.priceCents,
        approvedById: admin,
        approvedAt: new Date(now - 5 * DAY),
        isDemo: true,
      };
    }),
  });
  await db.advertisement.createMany({
    data: campaigns.map((c) => ({
      campaignId: c.id,
      headline: c.headline,
      body: c.body,
      targetUrl: `/companies/${slugify(COMPANIES[c.company]![0])}`,
      targetCompanyId: companyIds[c.company]!,
      reviewStatus: "APPROVED" as const,
    })),
  });

  // One pending claim so the moderation queue isn't empty (demo company, illustration only)
  await db.companyClaim.create({
    data: { companyId: companyIds[12]!, userId: users.get("member@demo.patronos.local")!, workEmail: "member@kyomori.example", roleTitle: "Managing editor", message: "Demo claim to illustrate the moderation queue." },
  });
  log("campaigns + claim queue ready");
}

async function main() {
  await seedReference();

  if (process.argv.includes("--if-empty")) {
    const marker = await db.siteSetting.findUnique({ where: { key: SEED_MARKER } });
    const realCompanies = await db.company.count({ where: { isDemo: false } });
    if (marker) {
      log(`demo seed skipped: already completed at ${JSON.stringify(marker.value)}`);
      return;
    }
    if (realCompanies > 0) {
      log(`demo seed skipped: database already holds ${realCompanies} real companies`);
      return;
    }
  }

  // Any partial or previous demo data is removed first (real data is never touched)
  const purged = await purgeDemoData(db);
  if (Object.values(purged).some((n) => n > 0)) log(`removed previous demo data: ${JSON.stringify(purged)}`);

  await seedDemo();
  await db.siteSetting.upsert({ where: { key: SEED_MARKER }, update: { value: new Date().toISOString() }, create: { key: SEED_MARKER, value: new Date().toISOString() } });

  const [companies, artists, artworks] = await Promise.all([
    db.company.count({ where: { isDemo: true } }),
    db.artist.count({ where: { isDemo: true } }),
    db.artwork.count({ where: { isDemo: true } }),
  ]);
  log(`Seeded DEMO data: ${companies} companies, ${artists} artists, ${artworks} artworks (all labeled DEMO).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
