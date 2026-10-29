import "server-only";
import { env } from "./env";

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number };

export interface RateLimiter {
  limit(key: string, max: number, windowMs: number): Promise<RateLimitResult>;
}

/** Fixed-window limiter kept in process memory. Fine for local dev and a single instance. */
export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async limit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      if (this.buckets.size > 10_000) this.sweep(now);
      return { ok: true, remaining: max - 1, resetAt: now + windowMs };
    }
    bucket.count += 1;
    return { ok: bucket.count <= max, remaining: Math.max(0, max - bucket.count), resetAt: bucket.resetAt };
  }

  private sweep(now: number) {
    for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
  }
}

/** Upstash Redis REST limiter — shared across serverless instances (use in production). */
export class UpstashRateLimiter implements RateLimiter {
  constructor(private url: string, private token: string) {}

  async limit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
    const windowKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", windowKey],
        ["PEXPIRE", windowKey, String(windowMs)],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return { ok: true, remaining: max, resetAt: Date.now() + windowMs }; // fail open, logged by monitoring
    const data = (await res.json()) as Array<{ result: number }>;
    const count = data[0]?.result ?? 0;
    return { ok: count <= max, remaining: Math.max(0, max - count), resetAt: Date.now() + windowMs };
  }
}

let limiter: RateLimiter | null = null;

export function rateLimiter(): RateLimiter {
  if (limiter) return limiter;
  const e = env();
  limiter =
    e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN
      ? new UpstashRateLimiter(e.UPSTASH_REDIS_REST_URL, e.UPSTASH_REDIS_REST_TOKEN)
      : new MemoryRateLimiter();
  return limiter;
}

export const LIMITS = {
  claim: { max: 5, windowMs: 60 * 60 * 1000 },
  inquiry: { max: 10, windowMs: 60 * 60 * 1000 },
  newsletter: { max: 5, windowMs: 60 * 60 * 1000 },
  signIn: { max: 10, windowMs: 15 * 60 * 1000 },
  adminMutation: { max: 120, windowMs: 60 * 1000 },
} as const;
