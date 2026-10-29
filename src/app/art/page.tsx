import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";
import { listArtworks } from "@/lib/queries/public";
import { ArtworkCard } from "@/components/cards";

export const metadata: Metadata = { title: "Art", description: "Artworks shown in true colour and proportion — inquire directly with artists and galleries." };

export default async function ArtPage() {
  const works = await listArtworks();
  return (
    <>
      <PageHeader eyebrow="Art" title="The gallery wall" intro="Every work at its true proportions, never cropped. Inquire directly with the artist or gallery." crumbs={[{ href: "/", label: "Home" }, { href: "/art", label: "Art" }]} />
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-12">
        <div className="gallery-wall">
          {works.map((w) => (
            <ArtworkCard key={w.id} a={w} width="fluid" />
          ))}
        </div>
      </div>
    </>
  );
}
