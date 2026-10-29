import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/directory";
import { countriesWithCounts } from "@/lib/queries/public";

export const metadata: Metadata = { title: "Discover by country", description: "Explore companies, artists and galleries country by country." };

const MACROS = [
  ["ASIA_PACIFIC", "Asia Pacific"],
  ["EUROPE", "Europe"],
  ["AMERICAS", "Americas"],
  ["MIDDLE_EAST_AFRICA", "Middle East & Africa"],
] as const;

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  const { region } = await searchParams;
  const active = MACROS.find(([k]) => k === region)?.[0];
  const countries = await countriesWithCounts();
  const groups = MACROS.filter(([k]) => !active || k === active).map(([k, label]) => ({ key: k, label, items: countries.filter((c) => c.macroRegion === k) }));

  return (
    <>
      <PageHeader eyebrow="Discover" title="The world, by country" intro="Start with a place. Each country page opens into its regions, cities and the companies and creators based there." crumbs={[{ href: "/", label: "Home" }, { href: "/discover", label: "Discover" }]}>
        <ul className="mt-8 flex flex-wrap gap-2" aria-label="Filter by world region">
          <li>
            <Link href="/discover" aria-current={!active ? "page" : undefined} className={`chip !py-2 border ${!active ? "border-[var(--gold)] text-gold-hover" : "border-white/15 text-muted hover:text-ink"}`}>
              All regions
            </Link>
          </li>
          {MACROS.map(([k, label]) => (
            <li key={k}>
              <Link href={`/discover?region=${k}`} aria-current={active === k ? "page" : undefined} className={`chip !py-2 border ${active === k ? "border-[var(--gold)] text-gold-hover" : "border-white/15 text-muted hover:text-ink"}`}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </PageHeader>
      <div className="mx-auto max-w-[1440px] space-y-14 px-4 py-12 sm:px-6 lg:px-12">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`g-${g.key}`}>
            <h2 id={`g-${g.key}`} className="eyebrow mb-5">
              {g.label}
            </h2>
            <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[24px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {g.items.map((c) => (
                <li key={c.slug} className="bg-bg">
                  <Link href={`/discover/${c.slug}`} className="group relative block p-7 transition-colors hover:bg-white/[0.02]">
                    <span className="display block text-[28px] transition-colors group-hover:text-gold-hover">{c.name}</span>
                    <span className="nums mt-2 block text-[13px] text-muted">
                      {c._count.companies} companies · {c._count.artists} artists
                    </span>
                    <span aria-hidden="true" className="absolute bottom-0 left-7 h-px w-0 bg-gold transition-[width] duration-500 group-hover:w-[calc(100%-56px)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
