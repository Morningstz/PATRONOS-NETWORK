import { describe, expect, it } from "vitest";
import { assertCan, can, ForbiddenError, UnauthenticatedError, type SessionUser } from "@/lib/authz";
import type { RoleName } from "@prisma/client";

const user = (roles: RoleName[], companyIds: string[] = []): SessionUser => ({ id: "u1", email: "u@x.test", displayName: "U", roles, companyIds, isDemo: false });

describe("authorization policy", () => {
  it("lets anyone read the directory", () => {
    expect(can(null, "directory:read")).toBe(true);
  });

  it("requires sign-in for claims and inquiries", () => {
    expect(can(null, "company:claim")).toBe(false);
    expect(can(null, "inquiry:create")).toBe(false);
    expect(can(user(["USER"]), "company:claim")).toBe(true);
  });

  it("keeps regular users out of admin", () => {
    for (const a of ["admin:access", "moderation:claims", "company:verify", "settings:manage", "demo:purge", "audit:read"] as const) {
      expect(can(user(["USER"]), a)).toBe(false);
      expect(can(user(["USER", "COMPANY_OWNER", "ADVERTISER", "ARTIST"]), a)).toBe(false);
    }
  });

  it("lets moderators moderate but not verify, purge or read the audit log", () => {
    const mod = user(["USER", "MODERATOR"]);
    expect(can(mod, "admin:access")).toBe(true);
    expect(can(mod, "moderation:claims")).toBe(true);
    expect(can(mod, "moderation:companies")).toBe(true);
    expect(can(mod, "company:verify")).toBe(false);
    expect(can(mod, "demo:purge")).toBe(false);
    expect(can(mod, "settings:manage")).toBe(false);
    expect(can(mod, "audit:read")).toBe(false);
  });

  it("gives admins every staff permission", () => {
    const admin = user(["USER", "ADMIN"]);
    for (const a of ["admin:access", "moderation:claims", "company:verify", "settings:manage", "demo:purge", "audit:read", "role:assign"] as const) {
      expect(can(admin, a)).toBe(true);
    }
  });

  it("only lets a company owner edit companies they are a member of", () => {
    const owner = user(["USER", "COMPANY_OWNER"], ["c1"]);
    expect(can(owner, "company:edit", { companyId: "c1" })).toBe(true);
    expect(can(owner, "company:edit", { companyId: "c2" })).toBe(false);
    expect(can(owner, "company:edit")).toBe(false);
    expect(can(user(["USER"], ["c1"]), "company:edit", { companyId: "c1" })).toBe(false);
  });

  it("throws the right error type", () => {
    expect(() => assertCan(null, "admin:access")).toThrow(UnauthenticatedError);
    expect(() => assertCan(user(["USER"]), "admin:access")).toThrow(ForbiddenError);
    expect(() => assertCan(user(["ADMIN"]), "admin:access")).not.toThrow();
  });
});
