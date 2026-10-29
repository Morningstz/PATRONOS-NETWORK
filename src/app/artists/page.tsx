import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";
import { listArtists } from "@/lib/queries/public";
import { ArtistCard } from "@/components/cards";

export const metadata: Metadata = { title: "Artists", description: "Painters, sculptors, printmakers and studios on PATRONOS." };

export default async function ArtistsPage() {
  const artists = await listArtists();
  return (
    <>
      <PageHeader eyebrow="Creators" title="Artists" intro="Meet the artists on PATRONOS — and see who is open to commissions and brand collaborations." crumbs={[{ href: "/", label: "Home" }, { href: "/artists", label: "Artists" }]} />
      <ul className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-12 px-4 py-12 sm:px-6 md:grid-cols-3 lg:grid-cols-4 lg:px-12">
        {artists.map((a) => (
          <li key={a.id}>
            <ArtistCard a={a} size="feature" />
          </li>
        ))}
      </ul>
    </>
  );
}
