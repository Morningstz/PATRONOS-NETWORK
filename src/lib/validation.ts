import { z } from "zod";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,80}$/);
const optionalSlug = slug.optional().catch(undefined);

/** Directory filters. Invalid values are dropped rather than erroring, so shared URLs never 500. */
export const companyFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  country: optionalSlug,
  region: optionalSlug,
  city: optionalSlug,
  industry: optionalSlug,
  category: z.enum(["STARTUP", "SME", "ENTERPRISE", "CREATIVE_STUDIO", "NONPROFIT"]).optional().catch(undefined),
  verification: z.enum(["UNVERIFIED", "CLAIMED", "VERIFIED"]).optional().catch(undefined),
  collaboration: z.enum(["OPEN", "SELECTIVE", "CLOSED"]).optional().catch(undefined),
  sort: z.enum(["recent", "name"]).default("recent").catch("recent"),
  view: z.enum(["grid", "list"]).default("grid").catch("grid"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});

export type CompanyFilters = z.infer<typeof companyFiltersSchema>;

export function parseCompanyFilters(input: Record<string, string | string[] | undefined>): CompanyFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(input)) flat[k] = Array.isArray(v) ? v[0] : v;
  for (const k of Object.keys(flat)) if (flat[k] === "") flat[k] = undefined;
  return companyFiltersSchema.parse(flat);
}

export const searchSchema = z.object({
  q: z.string().trim().max(80).default("").catch(""),
  type: z.enum(["all", "companies", "artists", "art", "acquisitions"]).default("all").catch("all"),
  country: optionalSlug,
  industry: optionalSlug,
});

export const claimSchema = z.object({
  companyId: z.string().uuid(),
  workEmail: z.string().trim().toLowerCase().email().max(200),
  roleTitle: z.string().trim().min(2).max(120),
  message: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
});

export const inquirySchema = z.object({
  artworkId: z.string().uuid(),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
});

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  consent: z.literal("on", { errorMap: () => ({ message: "Please agree to receive the digest" }) }),
});

export const reviewClaimSchema = z.object({
  claimId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(1000).optional(),
});

export const companyModerationSchema = z.object({
  companyId: z.string().uuid(),
  op: z.enum(["verify", "unverify", "hide", "restore"]),
});

export const purgeSchema = z.object({ confirm: z.literal("PURGE DEMO DATA") });

export const demoToggleSchema = z.object({ show: z.enum(["true", "false"]).transform((v) => v === "true") });

export const devSignInSchema = z.object({
  userId: z.string().uuid(),
  next: z.string().startsWith("/").refine((v) => !v.startsWith("//"), "Invalid redirect").default("/dashboard"),
});

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
