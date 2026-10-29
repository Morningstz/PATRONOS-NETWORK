import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

const COLUMNS = [
  { title: "Discover", links: [["/discover", "Countries"], ["/industries", "Industries"], ["/companies", "Companies"], ["/acquisitions", "Acquisitions"]] },
  { title: "Creators", links: [["/artists", "Artists"], ["/galleries", "Galleries"], ["/art", "Artworks"], ["/collaborations", "Collaborations"]] },
  { title: "Business", links: [["/advertise", "Advertise"], ["/list-your-company", "Claim your company"], ["/advertise#packages", "Pricing"]] },
  { title: "Company", links: [["/about", "About"], ["/journal", "Journal"], ["/legal/terms", "Terms"], ["/legal/privacy", "Privacy"], ["/legal/cookies", "Cookie preferences"], ["/report", "Report content"]] },
] as const;

const SOCIAL = [
  { href: "https://instagram.com", label: "Instagram", path: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5h.01" },
  { href: "https://linkedin.com", label: "LinkedIn", path: "M6 9v9M6 6v.01M10 18v-5a3 3 0 0 1 6 0v5M10 9v9" },
  { href: "https://x.com", label: "X", path: "M4 4l16 16M20 4 4 20" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)_1.6fr] lg:px-12">
        <div>
          <p className="display text-[26px] font-bold">PATRONOS</p>
          <p className="mt-3 max-w-xs text-[14px] text-muted">Where companies meet culture. A curated network of verified businesses, artists and galleries.</p>
          <ul className="mt-6 flex gap-3">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a href={s.href} rel="noopener noreferrer" target="_blank" aria-label={`PATRONOS on ${s.label}`} className="grid size-11 place-items-center rounded-full border border-white/15 text-muted transition-colors hover:border-[var(--gold)] hover:text-gold-hover">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="eyebrow mb-4">{col.title}</p>
            <ul className="space-y-2.5">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-[14px] text-muted transition-colors hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="md:col-span-2 lg:col-span-1">
          <p className="eyebrow mb-4">Join the Digest</p>
          <p className="mb-4 text-[14px] text-muted">A fortnightly letter on newly verified companies, artists open to collaboration, and acquisitions.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-6 py-6 text-[12px] text-faint sm:flex-row sm:justify-between lg:px-12">
          <p>© {new Date().getFullYear()} PATRONOS. All rights reserved.</p>
          <p>Demo data is always labeled. Sponsored placements are always labeled.</p>
        </div>
      </div>
    </footer>
  );
}
