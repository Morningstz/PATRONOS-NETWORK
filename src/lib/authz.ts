/**
 * Central authorization policy. Prisma bypasses Postgres RLS, so EVERY protected
 * read or mutation must pass through `can` / `assertCan` on the server.
 * This module is pure (no I/O) so the permission matrix is unit-tested directly.
 */
import type { RoleName } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  roles: RoleName[];
  companyIds: string[]; // companies where the user is OWNER or EDITOR
  isDemo: boolean;
};

export type Action =
  | "directory:read"
  | "company:claim"
  | "company:edit"
  | "inquiry:create"
  | "collaboration:create"
  | "campaign:create"
  | "campaign:read-own"
  | "admin:access"
  | "moderation:claims"
  | "moderation:companies"
  | "moderation:campaigns"
  | "moderation:reports"
  | "company:verify"
  | "audit:read"
  | "settings:manage"
  | "demo:purge"
  | "role:assign";

const STAFF: RoleName[] = ["MODERATOR", "ADMIN"];

/** Role × action matrix (see docs/PRD.md §Permissions). */
export const PERMISSIONS: Record<Action, RoleName[] | "anyone" | "signed-in"> = {
  "directory:read": "anyone",
  "company:claim": "signed-in",
  "company:edit": ["COMPANY_OWNER", ...STAFF], // owners additionally need membership (see can())
  "inquiry:create": "signed-in",
  "collaboration:create": "signed-in",
  "campaign:create": ["ADVERTISER", "COMPANY_OWNER", "ADMIN"],
  "campaign:read-own": ["ADVERTISER", "COMPANY_OWNER", "ADMIN"],
  "admin:access": STAFF,
  "moderation:claims": STAFF,
  "moderation:companies": STAFF,
  "moderation:campaigns": STAFF,
  "moderation:reports": STAFF,
  "company:verify": ["ADMIN"],
  "audit:read": ["ADMIN"],
  "settings:manage": ["ADMIN"],
  "demo:purge": ["ADMIN"],
  "role:assign": ["ADMIN"],
};

export function hasRole(user: SessionUser | null, ...roles: RoleName[]): boolean {
  return !!user && user.roles.some((r) => roles.includes(r));
}

export function can(user: SessionUser | null, action: Action, resource?: { companyId?: string }): boolean {
  const rule = PERMISSIONS[action];
  if (rule === "anyone") return true;
  if (!user) return false;
  if (rule === "signed-in") return true;
  if (!user.roles.some((r) => rule.includes(r))) return false;

  if (action === "company:edit" && !hasRole(user, ...STAFF)) {
    return !!resource?.companyId && user.companyIds.includes(resource.companyId);
  }
  return true;
}

export class ForbiddenError extends Error {
  constructor(public action: Action) {
    super(`Forbidden: ${action}`);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Sign in required");
    this.name = "UnauthenticatedError";
  }
}

export function assertCan(user: SessionUser | null, action: Action, resource?: { companyId?: string }): asserts user is SessionUser {
  if (!can(user, action, resource)) {
    if (!user) throw new UnauthenticatedError();
    throw new ForbiddenError(action);
  }
}
