/**
 * Vercel build: resolve Marketplace DB env names (any prefix) → Prisma, generate the client,
 * apply migrations, seed demo data on an EMPTY database only (SEED_DEMO_DATA=false disables),
 * then build Next.js.
 */
import { execSync } from "node:child_process";

const env = { ...process.env };
const pick = (...suffixes) => {
  for (const s of suffixes) {
    if (env[s]) return env[s];
    const k = Object.keys(env).filter((x) => x.endsWith(`_${s}`) && env[x]).sort((a, b) => a.length - b.length)[0];
    if (k) return env[k];
  }
};

env.DATABASE_URL = pick("POSTGRES_PRISMA_URL", "DATABASE_URL", "POSTGRES_URL");
env.DIRECT_URL = env.DIRECT_URL || pick("POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED") || env.DATABASE_URL;
// Expose Supabase auth keys to the browser bundle under the names the app expects
env.NEXT_PUBLIC_SUPABASE_URL = pick("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL") ?? "";
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = pick("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY") ?? "";

// Diagnostics: variable NAMES only, never values
const related = Object.keys(process.env).filter((k) => /POSTGRES|SUPABASE|DATABASE/i.test(k)).sort();
console.log(`Database-related env vars present: ${related.length ? related.join(", ") : "(none)"}`);
console.log(`Supabase auth: ${env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "configured" : "not configured (sign-in disabled)"}`);

if (!env.DATABASE_URL) {
  console.error("\n✖ No database configured. Connect a Postgres database (Supabase or Neon) to THIS project in Vercel → Storage, then redeploy.\n");
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit", env });
run("npx prisma generate");
run("npx prisma migrate deploy");
// Seed over the direct/session connection: long multi-statement work is more reliable than via the transaction pooler
if (env.SEED_DEMO_DATA !== "false") execSync("npx tsx prisma/seed.ts --if-empty", { stdio: "inherit", env: { ...env, DATABASE_URL: env.DIRECT_URL } });
run("npx next build");
