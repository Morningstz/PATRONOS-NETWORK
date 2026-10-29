import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  POSTGRES_PRISMA_URL: z.string().min(1).optional(),
  AUTH_MODE: z.enum(["supabase", "dev"]).optional(),
  ADMIN_EMAILS: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").optional(),
  IP_HASH_SALT: z.string().min(16).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  DEV_AUTH_LOCAL_TEST: z.string().optional(),
  VERCEL: z.string().optional(),
});

type Raw = z.infer<typeof schema>;
export type Env = Omit<Raw, "AUTH_MODE" | "NEXT_PUBLIC_SITE_URL"> & { AUTH_MODE: "supabase" | "dev"; NEXT_PUBLIC_SITE_URL: string };

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const d = parsed.data;
  if (!d.DATABASE_URL && !d.POSTGRES_PRISMA_URL) throw new Error("Invalid environment: DATABASE_URL (or POSTGRES_PRISMA_URL) is required");
  cached = {
    ...d,
    // Supabase keys present → Supabase auth, unless explicitly forced to dev locally
    AUTH_MODE: d.AUTH_MODE ?? (d.NEXT_PUBLIC_SUPABASE_URL && d.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "dev"),
    NEXT_PUBLIC_SITE_URL:
      d.NEXT_PUBLIC_SITE_URL ?? (d.VERCEL_PROJECT_PRODUCTION_URL ? `https://${d.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  };
  return cached;
}

/**
 * Dev auth (pick a seeded demo user, no password) is for local development only.
 * It is refused on Vercel and in production builds, except a local production
 * build started with DEV_AUTH_LOCAL_TEST=1 (used by the e2e suite).
 */
export function devAuthAllowed(e: Env = env()): boolean {
  if (e.AUTH_MODE !== "dev") return false;
  if (e.VERCEL) return false;
  if (e.NODE_ENV !== "production") return true;
  return e.DEV_AUTH_LOCAL_TEST === "1";
}

/** Emails that are granted ADMIN automatically on first sign-in (bootstrap the first administrator). */
export function adminEmails(): string[] {
  return (env().ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function sessionSecret(): Uint8Array {
  const s = env().SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is required for dev auth sessions");
  return new TextEncoder().encode(s);
}
