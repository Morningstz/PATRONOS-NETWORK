"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { requireAction } from "@/lib/auth/session";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { LIMITS, rateLimiter } from "@/lib/rate-limit";
import { SETTING_SHOW_DEMO } from "@/lib/settings";
import { companyModerationSchema, demoToggleSchema, purgeSchema, reviewClaimSchema } from "@/lib/validation";
import { purgeDemoData } from "@/lib/demo";
import type { FormState } from "./public";

async function guard<T>(fn: () => Promise<T>): Promise<T | FormState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UnauthenticatedError) return { ok: false, error: "Please sign in." };
    if (e instanceof ForbiddenError) return { ok: false, error: "You don't have permission to do that." };
    throw e;
  }
}

export type NoticeCode = "claim-approved" | "claim-rejected" | "company-saved" | "demo-hidden" | "demo-shown" | "demo-purged";

/** Redirect back to the admin page the form came from, carrying a notice CODE (never free text). */
function done(form: FormData, code: NoticeCode): never {
  const raw = String(form.get("returnTo") ?? "/admin");
  const path = raw.startsWith("/admin") && !raw.includes("//") ? raw : "/admin";
  const url = new URL(path, "http://x");
  url.searchParams.set("notice", code);
  redirect(`${url.pathname}${url.search}`);
}

async function throttle(userId: string) {
  const rl = await rateLimiter().limit(`admin:${userId}`, LIMITS.adminMutation.max, LIMITS.adminMutation.windowMs);
  if (!rl.ok) throw new Error("Rate limit exceeded");
}

export async function reviewClaim(_: FormState, form: FormData): Promise<FormState> {
  return guard(async () => {
    const actor = await requireAction("moderation:claims");
    await throttle(actor.id);
    const parsed = reviewClaimSchema.safeParse({ claimId: form.get("claimId"), decision: form.get("decision"), note: form.get("note") || undefined });
    if (!parsed.success) return { ok: false, error: "Invalid request." };

    const claim = await db.companyClaim.findUnique({ where: { id: parsed.data.claimId }, select: { id: true, status: true, companyId: true, userId: true, company: { select: { isDemo: true } } } });
    if (!claim || claim.status !== "PENDING") return { ok: false, error: "Claim not found or already reviewed." };
    if (claim.userId === actor.id) return { ok: false, error: "You cannot review your own claim." };

    await db.$transaction(async (tx) => {
      await tx.companyClaim.update({
        where: { id: claim.id },
        data: { status: parsed.data.decision, reviewedById: actor.id, reviewedAt: new Date(), reviewNote: parsed.data.note },
      });
      if (parsed.data.decision === "APPROVED") {
        await tx.companyMember.upsert({
          where: { companyId_userId: { companyId: claim.companyId, userId: claim.userId } },
          update: { role: "OWNER" },
          create: { companyId: claim.companyId, userId: claim.userId, role: "OWNER" },
        });
        await tx.userRole.upsert({ where: { userId_role: { userId: claim.userId, role: "COMPANY_OWNER" } }, update: {}, create: { userId: claim.userId, role: "COMPANY_OWNER" } });
        // Approving a claim marks ownership only. VERIFIED requires a separate admin verification.
        await tx.company.updateMany({ where: { id: claim.companyId, verificationStatus: "UNVERIFIED" }, data: { verificationStatus: "CLAIMED" } });
        // Reject any other pending claims for the same company.
        await tx.companyClaim.updateMany({
          where: { companyId: claim.companyId, status: "PENDING", id: { not: claim.id } },
          data: { status: "REJECTED", reviewedById: actor.id, reviewedAt: new Date(), reviewNote: "Another claim for this company was approved." },
        });
      }
      await writeAudit({ actorId: actor.id, action: `claim.${parsed.data.decision.toLowerCase()}`, entityType: "CompanyClaim", entityId: claim.id, metadata: { companyId: claim.companyId, note: parsed.data.note ?? null } }, tx);
    });

    revalidatePath("/admin/claims");
    revalidatePath("/admin");
    done(form, parsed.data.decision === "APPROVED" ? "claim-approved" : "claim-rejected");
  }) as Promise<FormState>;
}

export async function moderateCompany(_: FormState, form: FormData): Promise<FormState> {
  return guard(async () => {
    const parsed = companyModerationSchema.safeParse({ companyId: form.get("companyId"), op: form.get("op") });
    if (!parsed.success) return { ok: false, error: "Invalid request." };
    const { op, companyId } = parsed.data;
    const actor = await requireAction(op === "verify" || op === "unverify" ? "company:verify" : "moderation:companies");
    await throttle(actor.id);

    const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true, isDemo: true, verificationStatus: true, slug: true, _count: { select: { members: true } } } });
    if (!company) return { ok: false, error: "Company not found." };
    if (op === "verify" && company.isDemo) return { ok: false, error: "Demo companies can never be marked Verified." };

    await db.$transaction(async (tx) => {
      if (op === "verify") {
        await tx.company.update({ where: { id: companyId }, data: { verificationStatus: "VERIFIED", verifiedAt: new Date() } });
        await tx.companyVerification.create({ data: { companyId, method: "MANUAL", status: "APPROVED", verifiedById: actor.id, verifiedAt: new Date() } });
      } else if (op === "unverify") {
        await tx.company.update({ where: { id: companyId }, data: { verificationStatus: company._count.members > 0 ? "CLAIMED" : "UNVERIFIED", verifiedAt: null } });
      } else {
        await tx.company.update({ where: { id: companyId }, data: { status: op === "hide" ? "HIDDEN" : "ACTIVE" } });
      }
      await writeAudit({ actorId: actor.id, action: `company.${op}`, entityType: "Company", entityId: companyId }, tx);
    });

    revalidatePath("/admin/companies");
    revalidatePath(`/companies/${company.slug}`);
    done(form, "company-saved");
  }) as Promise<FormState>;
}

export async function setDemoVisibility(_: FormState, form: FormData): Promise<FormState> {
  return guard(async () => {
    const actor = await requireAction("settings:manage");
    const parsed = demoToggleSchema.safeParse({ show: form.get("show") });
    if (!parsed.success) return { ok: false, error: "Invalid request." };
    await db.siteSetting.upsert({ where: { key: SETTING_SHOW_DEMO }, update: { value: parsed.data.show }, create: { key: SETTING_SHOW_DEMO, value: parsed.data.show } });
    await writeAudit({ actorId: actor.id, action: "settings.demo_visibility", entityType: "SiteSetting", entityId: SETTING_SHOW_DEMO, metadata: { show: parsed.data.show } });
    revalidatePath("/", "layout");
    done(form, parsed.data.show ? "demo-shown" : "demo-hidden");
  }) as Promise<FormState>;
}

export async function purgeDemo(_: FormState, form: FormData): Promise<FormState> {
  return guard(async () => {
    const actor = await requireAction("demo:purge");
    const parsed = purgeSchema.safeParse({ confirm: form.get("confirm") });
    if (!parsed.success) return { ok: false, error: 'Type "PURGE DEMO DATA" exactly to confirm.' };
    const counts = await purgeDemoData(db, { keepUserId: actor.id });
    await writeAudit({ actorId: actor.id, action: "demo.purged", entityType: "System", metadata: counts });
    revalidatePath("/", "layout");
    done(form, "demo-purged");
  }) as Promise<FormState>;
}
