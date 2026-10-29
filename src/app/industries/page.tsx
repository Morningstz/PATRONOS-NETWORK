import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/directory";
import { industriesTree } from "@/lib/queries/public";

export const metadata: Metadata = { title: "Industries", description: "Browse companies by industry and sub-industry." };

export default async function IndustriesPage() {
  const tree = await industriesTree();
  return (
    <>
      <PageHeader eyebrow="Directory" title="Industries" intro="Every company sits in one industry. Pick a sector to see who's building in it, everywhere." crumbs={[{ href: "/", label: "Home" }, { href: "/industries", label: "Industries" }]} />
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-12">
        {tree.map((p) => {
          const total = p._count.companies + p.children.reduce((s, c) => s + c._count.companies, 0);
          return (
            <section key={p.slug} className="glass card-hover p-7" aria-labelledby={`ind-${p.slug}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`ind-${p.slug}`} className="display text-[28px]">
                  <Link href={`/industries/${p.slug}`} className="hover:text-gold-hover">
                    {p.name}
                  </Link>
                </h2>
                <span className="nums text-[13px] text-muted">{total}</span>
              </div>
              {p.description && <p className="mt-2 text-[14px] text-muted">{p.description}</p>}
              <ul className="mt-5 space-y-1 border-t border-white/[0.07] pt-4">
                {p.children.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/industries/${c.slug}`} className="flex items-center justify-between py-1.5 text-[14px] text-ink/90 hover:text-gold-hover">
                      <span>{c.name}</span>
                      <span className="nums text-faint">{c._count.companies}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
