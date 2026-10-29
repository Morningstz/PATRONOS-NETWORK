import { execSync } from "node:child_process";

/** Prepares the TEST database (never the dev DB): apply migrations, then seed reference + demo data. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/patronos_test";
  if (!/patronos_test|_test\b|test/i.test(url)) throw new Error(`Refusing to run tests against a non-test database: ${url}`);
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
}
