import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/directory";
import { acquisitionCardSelect, artistCardSelect, artworkCardSelect, companyCardSelect, companyWhere, filterOptions, publicAcquisition, visibility } from "@/lib/queries/public";
import { searchSchema } from "@/lib/validation";
import { AcquisitionCard, ArtistCard, ArtworkCard, CompanyCard } from "@/components/cards";
import { HeroSearch } from "@/components/home/HeroSearch";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = searchSchema.parse(await searchParams);
  const v = await visibility();
  const want = (t: string) => s.type === "all" || s.type === t;
  const q = s.q;
  const text = q ? { contains: q, mode: "insensitive" as const } : undefined;
  const geo = s.country ? { country: { slug: s.country } } : {};
  const ind = s.industry ? { OR: [{ industry: { slug: s.industry } }, { industry: { parent: { slug: s.industry } } }] } : {};
  const take = s.type === "all" ? 8 : 48;

  const [options, companies, artists, artworks, acquisitions] = await Promise.all([
    filterOptions(),
    want("companies") ? companyWhere({ q: q || undefined, country: s.country, industry: s.industry }).then((where) => db.company.findMany({ where, select: companyCardSelect, take, orderBy: { name: "asc" } })) : [],
    want("artists") && !s.industry
      ? db.artist.findMany({ where: { ...v, ...geo, ...(text ? { OR: [{ name: text }, { discipline: text }, { city: { name: text } }] } : {}) }, select: artistCardSelect, take, orderBy: { name: "asc" } })
      : [],
    want("art") && !s.industry
      ? db.artwork.findMany({ where: { ...v, ...(s.country ? { artist: { country: { slug: s.country } } } : {}), ...(text ? { OR: [{ title: text }, { medium: text }, { artist: { name: text } }] } : {}) }, select: artworkCardSelect, take })
      : [],
    want("acquisitions")
      ? db.acquisitionListing.findMany({ where: { status: "PUBLISHED", ...(v.isDemo === false ? { isDemo: false } : {}), ...geo, ...ind, ...(text ? { OR: [{ headline: text }, { summary: text }] } : {}) }, select: acquisitionCardSelect, take })
      : [],
  ]);
  const total = companies.length + artists.length + artworks.length + acquisitions.length;
  const more = (type: string) => `/search?${new URLSearchParams({ ...(q ? { q } : {}), type, ...(s.country ? { country: s.country } : {}), ...(s.industry ? { industry: s.industry } : {}) })}`;

  return (
    <>
      <PageHeader eyebrow="Search" title={q ? `Results for “${q}”` : "Search the network"} crumbs={[{ href: "/", label: "Home" }, { href: "/search", label: "Search" }]}>
        <div className="mt-8 max-w-3xl">
          <HeroSearch idPrefix="search" options={options} />
        </div>
      </PageHeader>
      <div className="mx-auto max-w-[1440px] space-y-14 px-4 py-12 sm:px-6 lg:px-12">
        <p role="status" className="text-[14px] text-muted">
          <span className="nums text-ink">{total}</span> result{total === 1 ? "" : "s"}
          {s.industry && " · artists and artworks aren't filtered by industry"}
        </p>
        {total === 0 && (
          <div className="panel px-6 py-16 text-center">
            <p className="display text-[28px]">Nothing found.</p>
            <p className="mt-3 text-muted">Try a broader term, or browse the <Link href="/companies" className="link-gold">directory</Link>.</p>
          </div>
        )}
        {companies.length > 0 && (
          <Group title="Companies" href={s.type === "all" ? more("companies") : undefined}>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{companies.map((c) => <li key={c.id} className="flex"><CompanyCard c={c} /></li>)}</ul>
          </Group>
        )}
        {artists.length > 0 && (
          <Group title="Artists" href={s.type === "all" ? more("artists") : undefined}>
            <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">{artists.map((a) => <li key={a.id}><ArtistCard a={a} size="feature" /></li>)}</ul>
          </Group>
        )}
        {artworks.length > 0 && (
          <Group title="Art" href={s.type === "all" ? more("art") : undefined}>
            <div className="gallery-wall">{artworks.map((a) => <ArtworkCard key={a.id} a={a} width="fluid" />)}</div>
          </Group>
        )}
        {acquisitions.length > 0 && (
          <Group title="Acquisitions" href={s.type === "all" ? more("acquisitions") : undefined}>
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{acquisitions.map((a) => <li key={a.id} className="flex"><AcquisitionCard a={publicAcquisition(a)} layout="grid" /></li>)}</ul>
          </Group>
        )}
      </div>
    </>
  );
}

function Group({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-6 flex items-end justify-between">
        <h2 className="display text-[30px]">{title}</h2>
        {href && <Link href={href} className="link-gold text-[12px] tracking-[0.2em] uppercase">See all →</Link>}
      </div>
      {children}
    </section>
  );
}
