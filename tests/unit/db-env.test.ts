import { describe, expect, it } from "vitest";
import { pickEnv, resolveDatabaseUrl, resolveDirectUrl, resolveSupabaseUrl } from "@/lib/db-env";

describe("hosting env resolution", () => {
  it("prefers the pgbouncer-safe Prisma URL", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "a", POSTGRES_PRISMA_URL: "b" })).toBe("b");
    expect(resolveDatabaseUrl({ DATABASE_URL: "a" })).toBe("a");
  });

  it("finds Marketplace variables with a custom prefix", () => {
    const env = { STORAGE_POSTGRES_PRISMA_URL: "pooled", STORAGE_POSTGRES_URL_NON_POOLING: "direct", STORAGE_SUPABASE_URL: "https://x.supabase.co" };
    expect(resolveDatabaseUrl(env)).toBe("pooled");
    expect(resolveDirectUrl(env)).toBe("direct");
    expect(resolveSupabaseUrl(env)).toBe("https://x.supabase.co");
  });

  it("does not match unrelated keys that merely contain the name", () => {
    expect(pickEnv({ MY_DATABASE_URL_BACKUP: "x" }, "DATABASE_URL")).toBeUndefined();
  });
});
