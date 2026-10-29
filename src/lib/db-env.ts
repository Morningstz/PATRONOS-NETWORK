/**
 * Resolves database / Supabase settings from whatever names the hosting platform injected.
 * Vercel Marketplace integrations may add a custom prefix (e.g. STORAGE_POSTGRES_PRISMA_URL),
 * so we also match by suffix. Shared by the app runtime, middleware and the build script.
 */
type EnvLike = Record<string, string | undefined>;

export function pickEnv(env: EnvLike, ...suffixes: string[]): string | undefined {
  for (const suffix of suffixes) {
    if (env[suffix]) return env[suffix];
    const key = Object.keys(env)
      .filter((k) => k.endsWith(`_${suffix}`) && env[k])
      .sort((a, b) => a.length - b.length)[0];
    if (key) return env[key];
  }
  return undefined;
}

export const resolveDatabaseUrl = (env: EnvLike = process.env) => pickEnv(env, "POSTGRES_PRISMA_URL", "DATABASE_URL", "POSTGRES_URL");
export const resolveDirectUrl = (env: EnvLike = process.env) =>
  env.DIRECT_URL || pickEnv(env, "POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED") || resolveDatabaseUrl(env);
export const resolveSupabaseUrl = (env: EnvLike = process.env) => pickEnv(env, "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
export const resolveSupabaseAnonKey = (env: EnvLike = process.env) =>
  pickEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
