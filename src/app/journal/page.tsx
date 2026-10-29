import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/directory";
import { ARTICLES } from "@/lib/journal";
import { GenerativeArt } from "@/components/art/GenerativeArt";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <>
      <PageHeader eyebrow="Journal" title="Notes from the network" intro="How PATRONOS works, and what we're learning from companies and creators." crumbs={[{ href: "/", label: "Home" }, { href: "/journal", label: "Journal" }]} />
      <ul className="mx-auto grid max-w-[1440px] gap-6 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-12">
        {ARTICLES.map((a) => (
          <li key={a.slug}>
            <article className="group glass relative h-full overflow-hidden p-0">
              <div className="editorial-image"><GenerativeArt seed={a.hue * 3 + 7} ratio={1.5} title={a.title} /></div>
              <div className="p-6">
                <p className="eyebrow">{a.category}</p>
                <h2 className="display mt-3 text-[24px] leading-tight"><Link href={`/journal/${a.slug}`} className="after:absolute after:inset-0">{a.title}</Link></h2>
                <p className="mt-3 text-[14px] text-muted">{a.dek}</p>
                <p className="mt-4 text-[12px] text-faint">{a.readMinutes} min read</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
