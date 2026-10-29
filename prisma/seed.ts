/**
 * Seeds reference data (geography, industries, ad placements) and clearly-labeled DEMO
 * data. Idempotent: reference data is upserted; demo data is purged and recreated.
 *   npm run db:seed
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { purgeDemoData } from "../src/lib/demo";
import { ACQUISITIONS, ARTISTS, ARTWORK_TITLES, COMPANIES, COUNTRIES, DEMO_USERS, GALLERIES, INDUSTRIES, MEDIUMS, PLACEMENTS } from "./seed-data";

const db = new PrismaClient();

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

const DAY = 86_400_000;

const cityName = (country: string, city: string) =>
  COUNTRIES.find((c) => c.slug === country)?.regions.flatMap((r) => r.cities).find(([, slug]) => slug === city)?.[0] ?? city;

async function seedReference() {
  for (const c of COUNTRIES) {
    const country = await db.country.upsert({
      where: { slug: c.slug },
      update: { name: c.name, macroRegion: c.macro },
      create: { name: c.name, slug: c.slug, iso2: c.iso2, macroRegion: c.macro },
    });
    for (const r of c.regions) {
      const region = await db.region.upsert({
        where: { countryId_slug: { countryId: country.id, slug: r.slug } },
        update: { name: r.name },
        create: { countryId: country.id, name: r.name, slug: r.slug },
      });
      for (const [name, slug] of r.cities) {
        await db.city.upsert({
          where: { countryId_slug: { countryId: country.id, slug } },
          update: { name, regionId: region.id },
          create: { countryId: country.id, regionId: region.id, name, slug },
        });
      }
    }
  }
  for (const ind of INDUSTRIES) {
    const parent = await db.industry.upsert({ where: { slug: ind.slug }, update: { name: ind.name, description: ind.description }, create: { name: ind.name, slug: ind.slug, description: ind.description } });
    for (const [name, slug] of ind.children) {
      await db.industry.upsert({ where: { slug }, update: { name, parentId: parent.id }, create: { name, slug, parentId: parent.id } });
    }
  }
  for (const p of PLACEMENTS) {
    await db.adPlacement.upsert({ where: { key: p.key }, update: { ...p }, create: { ...p } });
  }
}

async function seedDemo() {
  const now = Date.now();
  const r = rng(20261029);

  const source = await db.dataSource.upsert({
    where: { name: "PATRONOS Demo Seed" },
    update: {},
    create: { name: "PATRONOS Demo Seed", kind: "DEMO", notes: "Fictional sample data for demonstration. Not real organisations or people." },
  });

  const countries = new Map((await db.country.findMany()).map((c) => [c.slug, c]));
  const cities = await db.city.findMany();
  const cityBy = (country: string, city: string) => {
    const co = countries.get(country)!;
    const ci = cities.find((x) => x.countryId === co.id && x.slug === city);
    if (!ci) throw new Error(`Unknown city ${country}/${city}`);
    return { countryId: co.id, cityId: ci.id, regionId: ci.regionId };
  };
  const industries = new Map((await db.industry.findMany()).map((i) => [i.slug, i]));
  const regions = await db.region.findMany();

  // Users
  const users: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const user = await db.user.create({
      data: {
        email: u.email,
        isDemo: true,
        profile: { create: { displayName: u.name } },
        roles: { create: u.roles.map((role) => ({ role })) },
      },
    });
    users[u.email] = user.id;
  }

  // Companies (never VERIFIED — demo records cannot be verified)
  const companyIds: string[] = [];
  for (const [i, c] of COMPANIES.entries()) {
    const [name, industry, country, city, category, collab, founded, employees, tagline] = c;
    const loc = cityBy(country, city);
    const company = await db.company.create({
      data: {
        slug: slugify(name),
        name,
        tagline,
        description: `${name} is a fictional ${category === "CREATIVE_STUDIO" ? "creative studio" : "company"} created for the PATRONOS demo. ${tagline} This profile illustrates how verified businesses present their story, collaborations and services on PATRONOS.`,
        website: null,
        foundedYear: founded,
        employeeRange: employees,
        category,
        collaboration: collab,
        ...loc,
        industryId: industries.get(industry)!.id,
        verificationStatus: "UNVERIFIED",
        logoHue: Math.floor(r() * 21),
        isDemo: true,
        dataSourceId: source.id,
        createdAt: new Date(now - (COMPANIES.length - i) * DAY * 2),
      },
    });
    companyIds.push(company.id);
  }

  // Demo owner manages one demo company (seeded membership — demo companies cannot be claimed via the app)
  await db.companyMember.create({ data: { companyId: companyIds[0]!, userId: users["owner@demo.patronos.local"]!, role: "OWNER" } });
  await db.company.update({ where: { id: companyIds[0]! }, data: { verificationStatus: "CLAIMED" } });

  // Artists
  const artistIds: string[] = [];
  for (const [i, a] of ARTISTS.entries()) {
    const [name, discipline, country, city, collab, bio, hue] = a;
    const loc = cityBy(country, city);
    const artist = await db.artist.create({
      data: {
        slug: slugify(name),
        name,
        discipline,
        bio: `${bio} (Fictional demo artist.)`,
        countryId: loc.countryId,
        cityId: loc.cityId,
        collaboration: collab,
        portraitHue: hue,
        isDemo: true,
        dataSourceId: source.id,
        userId: i === 0 ? users["artist@demo.patronos.local"] : undefined,
        createdAt: new Date(now - (ARTISTS.length - i) * DAY),
      },
    });
    artistIds.push(artist.id);
  }

  // Galleries
  const galleryIds: string[] = [];
  for (const [name, country, city, description, artistIdx] of GALLERIES) {
    const loc = cityBy(country, city);
    const g = await db.gallery.create({
      data: { slug: slugify(name), name, description: `${description} (Fictional demo gallery.)`, countryId: loc.countryId, cityId: loc.cityId, isDemo: true, dataSourceId: source.id, artists: { create: artistIdx.map((i) => ({ artistId: artistIds[i]! })) } },
    });
    galleryIds.push(g.id);
  }

  // Artworks — 3 per artist, generated imagery, true aspect ratios
  const ratios = [0.75, 0.8, 1, 1.25, 1.5, 0.66, 1.33];
  const avail = ["AVAILABLE", "ON_REQUEST", "ON_REQUEST", "SOLD", "AVAILABLE", "NOT_FOR_SALE"] as const;
  let t = 0;
  for (const [ai, a] of ARTISTS.entries()) {
    const media = MEDIUMS[a[1]] ?? ["Mixed media"];
    const gallery = GALLERIES.findIndex((g) => g[4].includes(ai));
    for (let k = 0; k < 3; k++) {
      const title = ARTWORK_TITLES[t % ARTWORK_TITLES.length]!;
      const availability = avail[(t + k) % avail.length]!;
      const year = 2019 + ((t * 3) % 7);
      const ratio = ratios[(t * 5 + k) % ratios.length]!;
      const priced = availability === "AVAILABLE";
      const art = await db.artwork.create({
        data: {
          slug: slugify(`${title}-${a[0]}`),
          title,
          artistId: artistIds[ai]!,
          galleryId: gallery >= 0 ? galleryIds[gallery] : undefined,
          year,
          medium: media[k % media.length]!,
          dimensions: ratio >= 1 ? `${Math.round(80 * ratio)} × 80 cm` : `80 × ${Math.round(80 / ratio)} cm`,
          editionSize: a[1] === "Printmaker" || a[1] === "Photographer" ? 10 : null,
          editionNumber: a[1] === "Printmaker" || a[1] === "Photographer" ? 1 + k : null,
          availability,
          priceAmount: priced ? new Prisma.Decimal(1200 + Math.round(r() * 18) * 400) : null,
          priceCurrency: priced ? "USD" : null,
          description: `A fictional demo work by ${a[0]}, rendered by PATRONOS's generative placeholder engine so the demo needs no third-party imagery.`,
          aspectRatio: ratio,
          generativeSeed: 101 + t * 7,
          isDemo: true,
          dataSourceId: source.id,
          createdAt: new Date(now - (36 - t) * DAY * 0.5),
          provenance: {
            create: [
              { kind: "CREATED", occurredOn: new Date(`${year}-03-01`), description: `Created in the artist's studio in ${cityName(a[2], a[3])}`, source: "Artist statement (demo)" },
              ...(gallery >= 0 ? [{ kind: "EXHIBITED" as const, occurredOn: new Date(`${Math.min(year + 1, 2026)}-06-15`), description: `Exhibited at ${GALLERIES[gallery]![0]}`, source: "Gallery records (demo)" }] : []),
              { kind: "LISTED", occurredOn: new Date(now - (40 - t) * DAY), description: "Listed on PATRONOS", source: "PATRONOS" },
            ],
          },
        },
      });
      if (k === 0) {
        await db.collection.upsert({
          where: { slug: `${slugify(a[0])}-selected-works` },
          update: { items: { create: { artworkId: art.id, position: 0 } } },
          create: { slug: `${slugify(a[0])}-selected-works`, title: "Selected works", artistId: artistIds[ai]!, isDemo: true, items: { create: { artworkId: art.id, position: 0 } } },
        });
      } else {
        await db.collectionItem.create({ data: { collectionId: (await db.collection.findUniqueOrThrow({ where: { slug: `${slugify(a[0])}-selected-works` } })).id, artworkId: art.id, position: k } });
      }
      t++;
    }
  }

  // Acquisitions (private financials stored separately)
  for (const [i, a] of ACQUISITIONS.entries()) {
    await db.acquisitionListing.create({
      data: {
        slug: a.slug,
        companyId: a.companyIdx !== null ? companyIds[a.companyIdx] : undefined,
        headline: a.headline,
        summary: `${a.summary} (Fictional demo listing.)`,
        industryId: industries.get(a.industry)!.id,
        countryId: countries.get(a.country)!.id,
        regionId: a.region ? regions.find((x) => x.countryId === countries.get(a.country)!.id && x.slug === a.region)?.id : undefined,
        revenueRange: a.revenueRange,
        showRevenueRange: a.show,
        reasonForSale: a.reason,
        status: "PUBLISHED",
        isDemo: true,
        dataSourceId: source.id,
        createdAt: new Date(now - (6 - i) * DAY * 3),
        financials: { create: { currency: a.fin[0], askingPrice: a.fin[1], annualRevenue: a.fin[2], ebitda: a.fin[3] } },
      },
    });
  }

  // Sponsored campaigns (demo) — always labeled SPONSORED in the UI
  const placements = new Map((await db.adPlacement.findMany()).map((p) => [p.key, p]));
  const owner = users["owner@demo.patronos.local"]!;
  const admin = users["admin@demo.patronos.local"]!;
  const campaigns = [
    { name: "Ambrevale — Harvest season", placement: "homepage-shelf", company: 0, status: "LIVE" as const, start: -3, end: 11, headline: "Smart irrigation, now in 40 villages", body: "See how East Java growers cut water use this season." },
    { name: "Nethrin — Batik for brands", placement: "homepage-shelf", company: 3, status: "LIVE" as const, start: -1, end: 13, headline: "Commission contemporary batik", body: "Limited collaboration slots for 2027 collections." },
    { name: "Marrowind — Identity clinic", placement: "directory-spotlight", company: 9, status: "APPROVED" as const, start: 5, end: 19, headline: "Identity systems for museums", body: null },
    { name: "Tessaveil — Residency open call", placement: "country-feature", company: 4, status: "APPROVED" as const, start: 12, end: 26, headline: "Craft residency open call", body: null },
  ];
  for (const c of campaigns) {
    const p = placements.get(c.placement)!;
    const company = await db.company.findUniqueOrThrow({ where: { id: companyIds[c.company]! }, select: { id: true, slug: true } });
    await db.campaign.create({
      data: {
        name: c.name,
        advertiserId: owner,
        companyId: company.id,
        placementId: p.id,
        status: c.status,
        startsAt: new Date(now + c.start * DAY),
        endsAt: new Date(now + c.end * DAY),
        priceCents: p.priceCents,
        approvedById: admin,
        approvedAt: new Date(now - 5 * DAY),
        isDemo: true,
        ads: { create: { headline: c.headline, body: c.body, targetUrl: `/companies/${company.slug}`, targetCompanyId: company.id, reviewStatus: "APPROVED" } },
      },
    });
  }

  // A pending claim queue item for the moderation dashboard (on a demo company, for illustration only)
  await db.companyClaim.create({
    data: { companyId: companyIds[12]!, userId: users["member@demo.patronos.local"]!, workEmail: "member@kyomori.example", roleTitle: "Managing editor", message: "Demo claim to illustrate the moderation queue." },
  });
}

async function main() {
  if (process.argv.includes("--if-empty")) {
    const existing = await db.company.count();
    if (existing > 0) {
      await seedReference(); // keep reference data current, never touch existing records
      console.log(`Seed skipped: database already has ${existing} companies.`);
      return;
    }
  }
  await seedReference();
  const purged = await purgeDemoData(db);
  if (Object.values(purged).some((n) => n > 0)) console.log("Removed previous demo data:", purged);
  await seedDemo();
  const [companies, artists, artworks] = await Promise.all([db.company.count({ where: { isDemo: true } }), db.artist.count({ where: { isDemo: true } }), db.artwork.count({ where: { isDemo: true } })]);
  console.log(`Seeded DEMO data: ${companies} companies, ${artists} artists, ${artworks} artworks (all labeled DEMO).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
