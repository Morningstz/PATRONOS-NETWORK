import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

const { db } = await import("@/lib/db");
const q = await import("@/lib/queries/public");
const { purgeDemoData } = await import("@/lib/demo");
const { SETTING_SHOW_DEMO } = await import("@/lib/settings");

const FORBIDDEN_PUBLIC_KEYS = ["financials", "askingPrice", "annualRevenue", "ebitda", "privateNote", "workEmail", "evidenceAssetId", "email", "claims", "members", "verifications"];

function deepKeys(obj: unknown, acc = new Set<string>()): Set<string> {
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "_count") continue; // aggregate counts only, no record data
      acc.add(k);
      deepKeys(v, acc);
    }
  }
  return acc;
}

let realCompanyId = "";

beforeAll(async () => {
  const source = await db.dataSource.upsert({ where: { name: "Test fixtures" }, update: {}, create: { name: "Test fixtures", kind: "MANUAL" } });
  const country = await db.country.findUniqueOrThrow({ where: { slug: "indonesia" } });
  const industry = await db.industry.findUniqueOrThrow({ where: { slug: "agritech" } });
  const real = await db.company.upsert({
    where: { slug: "test-real-company" },
    update: { status: "ACTIVE" },
    create: { slug: "test-real-company", name: "Test Real Company", category: "SME", countryId: country.id, industryId: industry.id, dataSourceId: source.id, isDemo: false },
  });
  realCompanyId = real.id;
});

afterAll(async () => {
  await db.company.deleteMany({ where: { slug: { in: ["test-real-company", "test-hidden-company"] } } });
  await db.siteSetting.deleteMany({ where: { key: SETTING_SHOW_DEMO } });
  await db.$disconnect();
});

describe("public query layer", () => {
  it("never exposes private fields in company results", async () => {
    const c = await q.getCompany("ambrevale-agrisystems");
    expect(c).not.toBeNull();
    const keys = deepKeys(c);
    for (const k of FORBIDDEN_PUBLIC_KEYS) expect(keys.has(k), `leaked key ${k}`).toBe(false);
  });

  it("never exposes acquisition financials and hides revenue unless the owner opted in", async () => {
    const rows = await q.listAcquisitions(50);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const keys = deepKeys(r);
      for (const k of ["financials", "askingPrice", "annualRevenue", "ebitda"]) expect(keys.has(k)).toBe(false);
      if (!r.showRevenueRange) expect(r.revenueRange).toBeNull();
    }
    const hidden = await db.acquisitionListing.findFirstOrThrow({ where: { showRevenueRange: false, revenueRange: null }, select: { slug: true } });
    const pub = await q.getAcquisition(hidden.slug);
    expect(pub?.revenueRange).toBeNull();
  });

  it("filters the directory by country, verification and collaboration", async () => {
    const all = await q.listCompanies({ sort: "recent", view: "grid", page: 1 });
    const indo = await q.listCompanies({ country: "indonesia", sort: "recent", view: "grid", page: 1 });
    expect(indo.total).toBeGreaterThan(0);
    expect(indo.total).toBeLessThan(all.total);
    expect(indo.items.every((c) => c.country.slug === "indonesia")).toBe(true);
    const open = await q.listCompanies({ collaboration: "OPEN", sort: "recent", view: "grid", page: 1 });
    expect(open.items.every((c) => c.collaboration === "OPEN")).toBe(true);
    const verified = await q.listCompanies({ verification: "VERIFIED", sort: "recent", view: "grid", page: 1 });
    expect(verified.items.every((c) => !c.isDemo)).toBe(true); // demo records can never be verified
  });

  it("includes sub-industries when filtering by a parent industry", async () => {
    const parent = await q.listCompanies({ industry: "agriculture-industry", sort: "recent", view: "grid", page: 1 });
    const child = await q.listCompanies({ industry: "agritech", sort: "recent", view: "grid", page: 1 });
    expect(parent.total).toBeGreaterThanOrEqual(child.total);
    expect(child.total).toBeGreaterThan(0);
  });

  it("hides HIDDEN companies from public queries", async () => {
    await db.company.update({ where: { id: realCompanyId }, data: { status: "HIDDEN" } });
    expect(await q.getCompany("test-real-company")).toBeNull();
    await db.company.update({ where: { id: realCompanyId }, data: { status: "ACTIVE" } });
    expect(await q.getCompany("test-real-company")).not.toBeNull();
  });

  it("hides every demo record when demo visibility is switched off", async () => {
    await db.siteSetting.upsert({ where: { key: SETTING_SHOW_DEMO }, update: { value: false }, create: { key: SETTING_SHOW_DEMO, value: false } });
    const companies = await q.listCompanies({ sort: "recent", view: "grid", page: 1 });
    expect(companies.items.every((c) => !c.isDemo)).toBe(true);
    expect(companies.items.some((c) => c.id === realCompanyId)).toBe(true);
    expect(await q.listArtworks()).toHaveLength(0);
    expect(await q.listAcquisitions()).toHaveLength(0);
    expect(await q.liveSponsored("HOMEPAGE_SHELF")).toHaveLength(0);
    await db.siteSetting.update({ where: { key: SETTING_SHOW_DEMO }, data: { value: true } });
    expect((await q.listArtworks()).length).toBeGreaterThan(0);
  });

  it("only returns approved, live, in-window sponsored ads", async () => {
    const ads = await q.liveSponsored("HOMEPAGE_SHELF", 10);
    expect(ads.length).toBeGreaterThan(0);
    const ids = ads.map((a) => a.id);
    const rows = await db.advertisement.findMany({ where: { id: { in: ids } }, select: { reviewStatus: true, campaign: { select: { status: true, startsAt: true, endsAt: true } } } });
    const now = Date.now();
    for (const r of rows) {
      expect(r.reviewStatus).toBe("APPROVED");
      expect(r.campaign.status).toBe("LIVE");
      expect(r.campaign.startsAt.getTime()).toBeLessThanOrEqual(now);
      expect(r.campaign.endsAt.getTime()).toBeGreaterThanOrEqual(now);
    }
  });
});

describe("demo data separation", () => {
  it("demo companies are never verified", async () => {
    expect(await db.company.count({ where: { isDemo: true, verificationStatus: "VERIFIED" } })).toBe(0);
  });

  it("purging removes only demo records and keeps reference data", async () => {
    const before = { countries: await db.country.count(), industries: await db.industry.count(), placements: await db.adPlacement.count() };
    const counts = await purgeDemoData(db);
    expect(counts.companies).toBeGreaterThan(0);
    expect(await db.company.count({ where: { isDemo: true } })).toBe(0);
    expect(await db.artwork.count({ where: { isDemo: true } })).toBe(0);
    expect(await db.user.count({ where: { isDemo: true } })).toBe(0);
    expect(await db.acquisitionFinancials.count()).toBe(0); // cascaded with demo listings
    expect(await db.company.findUnique({ where: { id: realCompanyId } })).not.toBeNull();
    expect({ countries: await db.country.count(), industries: await db.industry.count(), placements: await db.adPlacement.count() }).toEqual(before);
    // restore demo data for the remaining suites / e2e
    execSync("npx tsx prisma/seed.ts", { env: process.env, stdio: "pipe" });
    expect(await db.company.count({ where: { isDemo: true } })).toBe(42);
  });
});
