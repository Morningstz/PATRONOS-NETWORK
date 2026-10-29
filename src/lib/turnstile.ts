import "server-only";
import { env } from "./env";

export type BotCheck = { ok: boolean; skipped: boolean };

/**
 * Verifies a Cloudflare Turnstile token. When no secret is configured (local dev),
 * the check is skipped and reported as such — production must set the keys
 * (enforced in README deployment checklist and docs/RISKS.md).
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<BotCheck> {
  const secret = env().TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, skipped: false };
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, cache: "no-store" });
    const data = (await res.json()) as { success?: boolean };
    return { ok: data.success === true, skipped: false };
  } catch {
    return { ok: false, skipped: false };
  }
}
