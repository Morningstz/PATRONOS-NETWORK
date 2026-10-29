import { describe, expect, it } from "vitest";
import { devAuthAllowed, type Env } from "@/lib/env";
import { MemoryRateLimiter } from "@/lib/rate-limit";

const base = { DATABASE_URL: "x", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" } as Env;

describe("dev auth guard", () => {
  it("is allowed only in local development", () => {
    expect(devAuthAllowed({ ...base, NODE_ENV: "development", AUTH_MODE: "dev" })).toBe(true);
    expect(devAuthAllowed({ ...base, NODE_ENV: "development", AUTH_MODE: "supabase" })).toBe(false);
  });

  it("is refused in production builds and on Vercel", () => {
    expect(devAuthAllowed({ ...base, NODE_ENV: "production", AUTH_MODE: "dev" })).toBe(false);
    expect(devAuthAllowed({ ...base, NODE_ENV: "development", AUTH_MODE: "dev", VERCEL: "1" })).toBe(false);
    expect(devAuthAllowed({ ...base, NODE_ENV: "production", AUTH_MODE: "dev", DEV_AUTH_LOCAL_TEST: "1", VERCEL: "1" })).toBe(false);
  });

  it("allows a local production build only with the explicit e2e flag", () => {
    expect(devAuthAllowed({ ...base, NODE_ENV: "production", AUTH_MODE: "dev", DEV_AUTH_LOCAL_TEST: "1" })).toBe(true);
  });
});

describe("memory rate limiter", () => {
  it("blocks after the limit and resets after the window", async () => {
    const rl = new MemoryRateLimiter();
    for (let i = 0; i < 3; i++) expect((await rl.limit("k", 3, 50)).ok).toBe(true);
    expect((await rl.limit("k", 3, 50)).ok).toBe(false);
    expect((await rl.limit("other", 3, 50)).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 60));
    expect((await rl.limit("k", 3, 50)).ok).toBe(true);
  });
});
