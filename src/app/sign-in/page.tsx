import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { devAuthAllowed } from "@/lib/env";
import { supabaseConfigured } from "@/lib/auth/supabase";
import { getSessionUser } from "@/lib/auth/session";
import { devSignIn } from "@/app/actions/auth";
import { safeNext } from "@/lib/validation";
import { MagicLinkForm } from "@/components/forms/MagicLinkForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getSessionUser()) redirect(next);
  const useSupabase = supabaseConfigured();
  const dev = !useSupabase && devAuthAllowed();
  const demoUsers = dev
    ? await db.user.findMany({ where: { isDemo: true }, orderBy: { email: "asc" }, select: { id: true, email: true, profile: { select: { displayName: true } }, roles: { select: { role: true } } } })
    : [];

  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-[480px] px-4 py-16 sm:py-24">
        <h1 className="display text-center text-[3rem]">Welcome back</h1>
        <p className="mt-3 text-center text-muted">Sign in to claim companies, send inquiries and manage your profile.</p>
        {sp.error && <p role="alert" className="mt-6 rounded-2xl border border-[var(--danger)]/40 p-3 text-center text-[14px] text-danger">Sign-in failed. Please try again.</p>}
        <div className="glass glow mt-10 p-7">
          {useSupabase ? (
            <MagicLinkForm next={next} />
          ) : dev ? (
            <>
              <p className="eyebrow">Local development sign-in</p>
              <p className="mt-2 text-[13px] text-muted">Supabase isn&rsquo;t configured, so you can sign in as a seeded DEMO user. This option is disabled on Vercel and in production.</p>
              <ul className="mt-5 space-y-2">
                {demoUsers.map((u) => (
                  <li key={u.id}>
                    <form action={devSignIn}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="next" value={next} />
                      <button type="submit" className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left transition-colors hover:border-[var(--gold)]">
                        <span>
                          <span className="block text-[15px] font-semibold">{u.profile?.displayName}</span>
                          <span className="block text-[12px] text-faint">{u.email}</span>
                        </span>
                        <span className="text-[11px] tracking-[0.14em] text-gold-light uppercase">{u.roles.map((r) => r.role).filter((r) => r !== "USER").join(" · ") || "Member"}</span>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              {demoUsers.length === 0 && <p className="mt-4 text-[14px] text-danger">No demo users found. Run <code>npm run db:seed</code>.</p>}
            </>
          ) : (
            <p className="text-[14px] text-muted">Sign-in is not configured for this environment. Set <code>AUTH_MODE=supabase</code> and the Supabase keys.</p>
          )}
        </div>
      </div>
    </div>
  );
}
