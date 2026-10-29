import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";
import { listGalleries } from "@/lib/queries/public";
import { GenerativeArt } from "@/components/art/GenerativeArt";
import { DemoBadge } from "@/components/ui/badges";

export const metadata: Metadata = { title: "Galleries" };

export default async function GalleriesPage() {
  const galleries = await listGalleries(48);
  return (
    <>
      <PageHeader eyebrow="Creators" title="Galleries" intro="Galleries and creative spaces representing artists on PATRONOS. Full gallery profiles arrive in the next release." crumbs={[{ href: "/", label: "Home" }, { href: "/galleries", label: "Galleries" }]} />
      <ul className="mx-auto grid max-w-[1440px] gap-6 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-12">
        {galleries.map((g, i) => (
          <li key={g.id} id={g.slug} className="glass scroll-mt-28 overflow-hidden p-0">
            <div className="h-[180px]">
              <GenerativeArt seed={400 + i * 13} ratio={2.6} title={`${g.name} exhibition view`} decorativeCover />
            </div>
            <div className="p-7">
              <div className="flex items-start justify-between gap-3">
                <h2 className="display text-[28px]">{g.name}</h2>
                {g.isDemo && <DemoBadge />}
              </div>
              <p className="mt-1 text-[14px] text-muted">{g.city?.name}, {g.country.name}</p>
              <p className="mt-4 text-[15px] text-ink/85">{g.description}</p>
              <p className="nums mt-4 text-[12px] tracking-[0.14em] text-gold-light uppercase">{g._count.artists} artists · {g._count.artworks} works</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
