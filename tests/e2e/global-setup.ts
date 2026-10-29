import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export const E2E_COMPANY_SLUG = "e2e-real-studio";

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/patronos_test";
  if (!/test/i.test(url)) throw new Error(`Refusing to run e2e against a non-test database: ${url}`);
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });

  // A NON-demo company so the claim → approve → verify flow can be exercised end to end.
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    await db.siteSetting.deleteMany();
    await db.company.deleteMany({ where: { slug: E2E_COMPANY_SLUG } });
    const source = await db.dataSource.upsert({ where: { name: "E2E fixtures" }, update: {}, create: { name: "E2E fixtures", kind: "MANUAL" } });
    const country = await db.country.findUniqueOrThrow({ where: { slug: "indonesia" } });
    const city = await db.city.findFirstOrThrow({ where: { slug: "surabaya" } });
    const industry = await db.industry.findUniqueOrThrow({ where: { slug: "design-branding" } });
    await db.company.create({
      data: {
        slug: E2E_COMPANY_SLUG,
        name: "E2E Real Studio",
        tagline: "Fixture company used by the end-to-end test suite.",
        website: "https://e2e-real-studio.test",
        category: "CREATIVE_STUDIO",
        collaboration: "OPEN",
        countryId: country.id,
        cityId: city.id,
        regionId: city.regionId,
        industryId: industry.id,
        dataSourceId: source.id,
        isDemo: false,
      },
    });
  } finally {
    await db.$disconnect();
  }
}
