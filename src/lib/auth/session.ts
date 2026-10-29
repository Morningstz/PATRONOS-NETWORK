import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "../db";
import { adminEmails, devAuthAllowed } from "../env";
import { readDevSession } from "./dev-session";
import { supabaseConfigured, supabaseServer } from "./supabase";
import { assertCan, can, type Action, type SessionUser } from "../authz";

async function loadUser(where: { id: string } | { authProviderId: string }): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where,
    select: {
      id: true,
      email: true,
      isDemo: true,
      profile: { select: { displayName: true } },
      roles: { select: { role: true } },
      companyMemberships: { select: { companyId: true } },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    isDemo: user.isDemo,
    displayName: user.profile?.displayName ?? user.email.split("@")[0]!,
    roles: user.roles.map((r) => r.role),
    companyIds: user.companyMemberships.map((m) => m.companyId),
  };
}

/** Links a Supabase auth user to an application User row (created on first sign-in). */
async function ensureAppUser(authId: string, email: string): Promise<SessionUser | null> {
  const existing = await loadUser({ authProviderId: authId });
  if (existing) return existing;
  const bootstrapAdmin = adminEmails().includes(email);
  const user = await db.user.upsert({
    where: { email },
    update: { authProviderId: authId },
    create: {
      email,
      authProviderId: authId,
      profile: { create: { displayName: email.split("@")[0]! } },
      roles: { create: { role: "USER" } },
    },
  });
  if (bootstrapAdmin) {
    await db.userRole.upsert({ where: { userId_role: { userId: user.id, role: "ADMIN" } }, update: {}, create: { userId: user.id, role: "ADMIN" } });
    await db.auditLog.create({ data: { actorId: user.id, action: "role.bootstrap_admin", entityType: "User", entityId: user.id } });
  }
  return loadUser({ authProviderId: authId });
}

/** The signed-in user for this request, or null. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  await cookies(); // always opt into dynamic rendering: auth state must never be baked in at build time
  if (supabaseConfigured()) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser(); // verifies the JWT with Supabase
    if (!data.user?.email) return null;
    return ensureAppUser(data.user.id, data.user.email.toLowerCase());
  }
  if (devAuthAllowed()) {
    const id = await readDevSession();
    return id ? loadUser({ id }) : null;
  }
  return null;
});

/** For pages: redirects to sign-in (or a 403 page) instead of throwing. */
export async function requirePageAccess(action: Action, next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!can(user, action)) redirect("/forbidden");
  return user;
}

/** For server actions and route handlers: throws ForbiddenError / UnauthenticatedError. */
export async function requireAction(action: Action, resource?: { companyId?: string }): Promise<SessionUser> {
  const user = await getSessionUser();
  assertCan(user, action, resource);
  return user;
}
