import Link from "next/link";

export const ART_HOUSE_LINKS = [
  { href: "/art", label: "Browse" },
  { href: "/studio", label: "Studio" },
  { href: "/lens", label: "Art Lens" },
  { href: "/assistant", label: "Assistant" },
  { href: "/daily", label: "Daily" },
  { href: "/saved", label: "Saved" },
] as const;

/** Secondary navigation for the Art House section. */
export function ArtHouseNav({ current }: { current: (typeof ART_HOUSE_LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Art House" className="mt-8 -mb-2 overflow-x-auto">
      <ul className="flex gap-2 pb-2">
        {ART_HOUSE_LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={l.href === current ? "page" : undefined}
              className={`inline-flex min-h-[40px] items-center rounded-full border px-4 text-[13px] whitespace-nowrap transition-colors ${l.href === current ? "border-gold bg-[var(--gold-tint)] text-ink" : "border-white/10 text-muted hover:border-white/30 hover:text-ink"}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
