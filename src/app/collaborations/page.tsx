import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/directory";
import { artistCardSelect, companyCardSelect, visibility } from "@/lib/queries/public";
import { ArtistCard, CompanyCard } from "@/components/cards";
import Link from "next/link";

export const metadata: Metadata = { title: "Collaborations" };

export default async function CollaborationsPage() {
  const v = await visibility();
  const [artists, companies] = await Promise.all([
    db.artist.findMany({ where: { ...v, collaboration: "OPEN" }, select: artistCardSelect, orderBy: { name: "asc" } }),
    db.company.findMany({ where: { ...v, deletedAt: null, collaboration: "OPEN" }, select: companyCardSelect, orderBy: { name: "asc" }, take: 24 }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Collaborations" title="Open to collaboration" intro="Artists, studios and companies currently welcoming commissions and partnerships. Direct requests open in the next release." crumbs={[{ href: "/", label: "Home" }, { href: "/collaborations", label: "Collaborations" }]}>
        <Link href="/journal/collaboration-briefs-artists-accept" className="link-gold mt-6 inline-block text-[14px]">Read: briefs that artists say yes to →</Link>
      </PageHeader>
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-12" aria-labelledby="c-artists">
        <h2 id="c-artists" className="display mb-8 text-[2rem]">Artists</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">{artists.map((a) => <li key={a.id}><ArtistCard a={a} size="feature" /></li>)}</ul>
      </section>
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-12" aria-labelledby="c-companies">
        <h2 id="c-companies" className="display mb-8 text-[2rem]">Companies & studios</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{companies.map((c) => <li key={c.id} className="flex"><CompanyCard c={c} /></li>)}</ul>
        <Link href="/companies?collaboration=OPEN" className="link-gold mt-8 inline-block text-[12px] tracking-[0.2em] uppercase">All open companies →</Link>
      </section>
    </>
  );
}
