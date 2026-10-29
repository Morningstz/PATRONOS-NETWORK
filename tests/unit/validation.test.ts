import { describe, expect, it } from "vitest";
import { claimSchema, newsletterSchema, parseCompanyFilters, purgeSchema, safeNext } from "@/lib/validation";

describe("directory filter parsing", () => {
  it("keeps valid filters", () => {
    const f = parseCompanyFilters({ country: "indonesia", verification: "VERIFIED", collaboration: "OPEN", page: "2", sort: "name" });
    expect(f).toMatchObject({ country: "indonesia", verification: "VERIFIED", collaboration: "OPEN", page: 2, sort: "name" });
  });

  it("drops invalid or malicious values instead of throwing", () => {
    const f = parseCompanyFilters({ country: "../etc/passwd", verification: "SUPER", page: "-4", sort: "drop table", category: ["STARTUP", "SME"], q: "x".repeat(500) });
    expect(f.country).toBeUndefined();
    expect(f.verification).toBeUndefined();
    expect(f.page).toBe(1);
    expect(f.sort).toBe("recent");
    expect(f.category).toBe("STARTUP");
    expect(f.q).toBeUndefined();
  });

  it("treats empty strings as unset", () => {
    expect(parseCompanyFilters({ country: "", industry: "" })).toMatchObject({ country: undefined, industry: undefined });
  });
});

describe("safeNext (open-redirect protection)", () => {
  it.each([
    ["/companies", "/companies"],
    ["https://evil.example", "/dashboard"],
    ["//evil.example", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["", "/dashboard"],
    [null, "/dashboard"],
  ])("%s → %s", (input, expected) => {
    expect(safeNext(input as string | null)).toBe(expected);
  });
});

describe("form schemas", () => {
  it("validates claims", () => {
    expect(claimSchema.safeParse({ companyId: "not-a-uuid", workEmail: "a@b.co", roleTitle: "CEO" }).success).toBe(false);
    expect(claimSchema.safeParse({ companyId: "3f1c2a9e-1b2c-4d5e-8f90-123456789abc", workEmail: "nope", roleTitle: "CEO" }).success).toBe(false);
    const ok = claimSchema.safeParse({ companyId: "3f1c2a9e-1b2c-4d5e-8f90-123456789abc", workEmail: " Owner@Firm.CO ", roleTitle: "CEO", message: "" });
    expect(ok.success && ok.data.workEmail).toBe("owner@firm.co");
  });

  it("requires explicit newsletter consent", () => {
    expect(newsletterSchema.safeParse({ email: "a@b.co" }).success).toBe(false);
    expect(newsletterSchema.safeParse({ email: "a@b.co", consent: "on" }).success).toBe(true);
  });

  it("requires the exact purge confirmation phrase", () => {
    expect(purgeSchema.safeParse({ confirm: "purge demo data" }).success).toBe(false);
    expect(purgeSchema.safeParse({ confirm: "PURGE DEMO DATA" }).success).toBe(true);
  });
});
