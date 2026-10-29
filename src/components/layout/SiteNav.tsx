import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz";
import { MobileMenu, NavShell } from "./NavClient";

export const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/companies", label: "Companies" },
  { href: "/artists", label: "Artists" },
  { href: "/art", label: "Art" },
  { href: "/acquisitions", label: "Acquisitions" },
  { href: "/advertise", label: "Advertise" },
  { href: "/journal", label: "Journal" },
];

export async function SiteNav() {
  const user = await getSessionUser();
  const isStaff = can(user, "admin:access");
  return (
    <NavShell>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-6 lg:h-[72px] lg:px-12">
        <Link href="/" className="display text-[22px] font-bold tracking-[0.02em] text-ink" aria-label="PATRONOS home">
          PATRONOS
        </Link>
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase transition-colors duration-300 hover:text-gold-hover">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/search" aria-label="Search PATRONOS" className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:text-gold-hover">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
          {user ? (
            <>
              {isStaff && (
                <Link href="/admin" className="hidden text-[11px] tracking-[0.2em] text-gold-light uppercase hover:text-gold-hover sm:inline">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="hidden text-[11px] tracking-[0.2em] text-muted uppercase hover:text-gold-hover sm:inline">
                {user.displayName}
              </Link>
            </>
          ) : (
            <Link href="/sign-in" className="hidden text-[11px] tracking-[0.2em] text-muted uppercase hover:text-gold-hover sm:inline">
              Sign in
            </Link>
          )}
          <Link href="/list-your-company" className="btn btn-solid hidden !min-h-10 md:inline-flex">
            List your company
          </Link>
          <MobileMenu links={NAV_LINKS} signedIn={!!user} isStaff={isStaff} />
        </div>
      </div>
    </NavShell>
  );
}
