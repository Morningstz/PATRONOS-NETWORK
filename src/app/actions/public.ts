"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { hashIdentifier } from "@/lib/hash";
import { LIMITS, rateLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { verifyTurnstile } from "@/lib/turnstile";
import { claimSchema, inquirySchema, newsletterSchema } from "@/lib/validation";

export type FormState = { ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> };

function firstErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

export async function subscribeDigest(_: FormState, form: FormData): Promise<FormState> {
  const parsed = newsletterSchema.safeParse({ email: form.get("email"), consent: form.get("consent") });
  if (!parsed.success) return { ok: false, error: Object.values(firstErrors(parsed.error.issues))[0] };

  const ip = await clientIp();
  const rl = await rateLimiter().limit(`newsletter:${hashIdentifier(ip)}`, LIMITS.newsletter.max, LIMITS.newsletter.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many attempts. Please try again later." };

  const user = await getSessionUser();
  await db.consentRecord.create({
    data: {
      userId: user?.id,
      subjectEmail: parsed.data.email,
      purpose: "NEWSLETTER",
      granted: true,
      version: "digest-v1-pending-confirmation",
    },
  });
  return { ok: true, message: "Thank you — you're on the list. A confirmation email will follow once sending is enabled." };
}

export async function submitClaim(_: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to claim a company." };

  const parsed = claimSchema.safeParse({
    companyId: form.get("companyId"),
    workEmail: form.get("workEmail"),
    roleTitle: form.get("roleTitle"),
    message: form.get("message") ?? "",
  });
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error.issues), error: "Please check the highlighted fields." };

  const ip = await clientIp();
  const bot = await verifyTurnstile(form.get("cf-turnstile-response")?.toString(), ip);
  if (!bot.ok) return { ok: false, error: "Bot check failed. Please try again." };

  const rl = await rateLimiter().limit(`claim:${user.id}`, LIMITS.claim.max, LIMITS.claim.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many claim attempts. Please try again later." };

  const company = await db.company.findFirst({
    where: { id: parsed.data.companyId, status: "ACTIVE", deletedAt: null },
    select: { id: true, slug: true, isDemo: true, verificationStatus: true, _count: { select: { members: true } } },
  });
  if (!company) return { ok: false, error: "Company not found." };
  if (company.isDemo) return { ok: false, error: "Demo profiles are fictional and cannot be claimed." };
  if (company._count.members > 0) return { ok: false, error: "This company has already been claimed. Contact support if you believe this is wrong." };

  const existing = await db.companyClaim.findFirst({ where: { companyId: company.id, userId: user.id, status: "PENDING" } });
  if (existing) return { ok: false, error: "You already have a pending claim for this company." };

  await db.$transaction(async (tx) => {
    const claim = await tx.companyClaim.create({
      data: {
        companyId: company.id,
        userId: user.id,
        workEmail: parsed.data.workEmail,
        roleTitle: parsed.data.roleTitle,
        message: parsed.data.message,
      },
    });
    await writeAudit({ actorId: user.id, action: "claim.submitted", entityType: "CompanyClaim", entityId: claim.id, metadata: { companyId: company.id } }, tx);
  });

  revalidatePath("/dashboard");
  return { ok: true, message: "Claim submitted. A moderator will review it — you'll see the status on your dashboard." };
}

export async function submitInquiry(_: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to send an inquiry." };

  const parsed = inquirySchema.safeParse({ artworkId: form.get("artworkId"), message: form.get("message") });
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error.issues), error: "Please check the highlighted fields." };

  const ip = await clientIp();
  const bot = await verifyTurnstile(form.get("cf-turnstile-response")?.toString(), ip);
  if (!bot.ok) return { ok: false, error: "Bot check failed. Please try again." };

  const rl = await rateLimiter().limit(`inquiry:${user.id}`, LIMITS.inquiry.max, LIMITS.inquiry.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many inquiries. Please try again later." };

  const artwork = await db.artwork.findFirst({ where: { id: parsed.data.artworkId, status: "ACTIVE" }, select: { id: true, isDemo: true, availability: true } });
  if (!artwork) return { ok: false, error: "Artwork not found." };
  if (artwork.availability === "SOLD" || artwork.availability === "NOT_FOR_SALE") return { ok: false, error: "This work is not available for inquiries." };

  await db.$transaction(async (tx) => {
    const inq = await tx.inquiry.create({ data: { senderId: user.id, targetType: "ARTWORK", artworkId: artwork.id, message: parsed.data.message } });
    await writeAudit({ actorId: user.id, action: "inquiry.created", entityType: "Inquiry", entityId: inq.id, metadata: { artworkId: artwork.id, demo: artwork.isDemo } }, tx);
  });

  revalidatePath("/dashboard");
  return {
    ok: true,
    message: artwork.isDemo
      ? "Inquiry recorded. Note: this is a demo artwork, so no real artist will receive it."
      : "Inquiry sent. The artist or gallery will reply through PATRONOS.",
  };
}
