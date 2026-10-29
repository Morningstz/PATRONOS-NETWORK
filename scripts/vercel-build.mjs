/**
 * Vercel build: map Marketplace DB env names → Prisma, apply migrations, seed demo data on an
 * EMPTY database only (SEED_DEMO_DATA=false disables), then build Next.js.
 */
import { execSync } from "node:child_process";

const env = { ...process.env };
env.DATABASE_URL = env.POSTGRES_PRISMA_URL || env.DATABASE_URL;
env.DIRECT_URL = env.DIRECT_URL || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;

if (!env.DATABASE_URL) {
  console.error("\n✖ No database configured. Connect a Postgres database (Supabase or Neon) in Vercel → Storage, then redeploy.\n");
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit", env });
run("npx prisma migrate deploy");
if (env.SEED_DEMO_DATA !== "false") run("npx tsx prisma/seed.ts --if-empty");
run("npx next build");
