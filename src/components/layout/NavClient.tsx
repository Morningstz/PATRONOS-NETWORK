"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function NavShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled ? "border-white/10 bg-[rgba(10,10,10,0.72)] backdrop-blur-[14px]" : "border-transparent bg-[rgba(10,10,10,0.35)] backdrop-blur-[6px]"
      }`}
    >
      {children}
    </header>
  );
}

export function MobileMenu({ links, signedIn, isStaff }: { links: { href: string; label: string }[]; signedIn: boolean; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)} className="grid size-11 place-items-center rounded-full border border-white/15">
        <span aria-hidden="true" className="relative block h-3 w-4">
          <span className={`absolute left-0 h-px w-4 bg-ink transition-transform duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
          <span className={`absolute left-0 h-px w-4 bg-ink transition-transform duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
        </span>
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-[rgba(10,10,10,0.94)] px-6 pt-8 pb-16 backdrop-blur-[14px]">
          <nav aria-label="Mobile">
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="display block py-2 text-[2rem] text-ink hover:text-gold-hover">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8">
            <Link href="/list-your-company" className="btn btn-solid">
              List your company
            </Link>
            {signedIn ? (
              <>
                <Link href="/dashboard" className="btn btn-outline">
                  Dashboard
                </Link>
                {isStaff && (
                  <Link href="/admin" className="btn btn-outline">
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <Link href="/sign-in" className="btn btn-outline">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
