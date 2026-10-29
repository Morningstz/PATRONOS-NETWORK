"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { devAuthAllowed, env } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { clearDevSession, createDevSession } from "@/lib/auth/dev-session";
import { supabaseConfigured, supabaseServer } from "@/lib/auth/supabase";
import { hashIdentifier } from "@/lib/hash";
import { LIMITS, rateLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { verifyTurnstile } from "@/lib/turnstile";
import { devSignInSchema, safeNext } from "@/lib/validation";
import type { FormState } from "./public";

/** Local development only: sign in as a seeded DEMO user. Refused outside dev (see env.devAuthAllowed). */
export async function devSignIn(form: FormData) {
  if (!devAuthAllowed()) throw new Error("Dev sign-in is disabled in this environment.");
  const parsed = devSignInSchema.safeParse({ userId: form.get("userId"), next: form.get("next") || undefined });
  if (!parsed.success) redirect("/sign-in?error=invalid");

  const user = await db.user.findFirst({ where: { id: parsed.data.userId, isDemo: true }, select: { id: true } });
  if (!user) redirect("/sign-in?error=unknown-user");

  await createDevSession(user.id);
  await writeAudit({ actorId: user.id, action: "auth.dev_sign_in", entityType: "User", entityId: user.id });
  redirect(safeNext(parsed.data.next));
}

const magicLinkSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), next: z.string().optional() });

/** Supabase passwordless sign-in (magic link). */
export async function sendMagicLink(_: FormState, form: FormData): Promise<FormState> {
  if (!supabaseConfigured()) return { ok: false, error: "Email sign-in is not configured in this environment." };
  const parsed = magicLinkSchema.safeParse({ email: form.get("email"), next: form.get("next") ?? undefined });
  if (!parsed.success) return { ok: false, error: "Please enter a valid email address." };

  const ip = await clientIp();
  const rl = await rateLimiter().limit(`signin:${hashIdentifier(ip)}`, LIMITS.signIn.max, LIMITS.signIn.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many attempts. Please wait a few minutes." };

  const bot = await verifyTurnstile(form.get("cf-turnstile-response")?.toString(), ip);
  if (!bot.ok) return { ok: false, error: "Bot check failed. Please try again." };

  const supabase = await supabaseServer();
  const next = safeNext(parsed.data.next);
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  // Same response whether or not the account exists (no user enumeration).
  if (error && error.status !== 422) return { ok: false, error: "We couldn't send the link right now. Please try again." };
  return { ok: true, message: "Check your inbox — we've sent you a secure sign-in link." };
}

export async function signOut() {
  if (supabaseConfigured()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  await clearDevSession();
  redirect("/");
}
