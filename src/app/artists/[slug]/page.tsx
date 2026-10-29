import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtist } from "@/lib/queries/public";
import { AbstractPortrait } from "@/components/art/Monogram";
import { ArtworkCard } from "@/components/cards";
import { CollabChip, DemoBanner, VerificationBadge } from "@/components/ui/badges";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArtist((await params).slug);
  if (!a) return { title: "Artist not found" };
  return { title: a.name, description: a.bio ?? undefined, robots: a.isDemo ? { index: false } : undefined, alternates: { canonical: `/artists/${a.slug}` } };
}

export default async function ArtistPage({ params }: Props) {
  const a = await getArtist((await params).slug);
  if (!a) notFound();
  return (
    <article>
      {a.isDemo && <DemoBanner label="DEMO — fictional artist created for demonstration." />}
      <header className="mx-auto grid max-w-[1440px] gap-10 px-4 pt-12 pb-10 sm:px-6 md:grid-cols-[1.2fr_1fr] md:pt-16 lg:px-12">
        <div>
          <nav aria-label="Breadcrumb" className="mb-6 text-[12px] tracking-[0.14em] text-faint uppercase">
            <Link href="/artists" className="hover:text-ink">Artists</Link>
          </nav>
          <p className="text-[11px] font-light tracking-[0.28em] text-gold uppercase">{a.discipline} · {a.city?.name ?? a.country.name}</p>
          <h1 className="display mt-3 text-[clamp(2.75rem,7vw,5.5rem)]">{a.name}</h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink/90">{a.bio}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <VerificationBadge status={a.verificationStatus} isDemo={a.isDemo} />
            <CollabChip value={a.collaboration} />
          </div>
          {a.galleries.length > 0 && (
            <p className="mt-6 text-[14px] text-muted">Represented by {a.galleries.map((g) => g.gallery.name).join(", ")}</p>
          )}
          <button type="button" disabled className="btn btn-outline mt-8">Request collaboration — opening soon</button>
        </div>
        <div className="group mx-auto w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10">
          <AbstractPortrait name={a.name} hue={a.portraitHue} className="editorial-image" />
        </div>
      </header>
      <section aria-labelledby="works" className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-12">
        <h2 id="works" className="display mb-8 text-[2rem]">Works <span className="nums text-[18px] text-muted not-italic">({a.artworks.length})</span></h2>
        <div className="gallery-wall">
          {a.artworks.map((w) => (
            <ArtworkCard key={w.id} a={w} width="fluid" />
          ))}
        </div>
      </section>
    </article>
  );
}
