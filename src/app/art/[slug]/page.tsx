import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtwork, moreFromArtist } from "@/lib/queries/public";
import { getSessionUser } from "@/lib/auth/session";
import { GenerativeArt } from "@/components/art/GenerativeArt";
import { ArtworkCard } from "@/components/cards";
import { DemoBanner } from "@/components/ui/badges";
import { Shelf } from "@/components/ui/Shelf";
import { InquiryForm } from "@/components/forms/InquiryForm";

type Props = { params: Promise<{ slug: string }> };

const AVAILABILITY = { AVAILABLE: "Available", ON_REQUEST: "Available — price on request", SOLD: "Sold", NOT_FOR_SALE: "Not for sale" } as const;
const KIND = { CREATED: "Created", EXHIBITED: "Exhibited", ACQUIRED: "Acquired", LISTED: "Listed", PUBLISHED: "Published" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = await getArtwork((await params).slug);
  if (!w) return { title: "Artwork not found" };
  return { title: `${w.title} — ${w.artist.name}`, description: w.description ?? undefined, robots: w.isDemo ? { index: false } : undefined, alternates: { canonical: `/art/${w.slug}` } };
}

export default async function ArtworkPage({ params }: Props) {
  const w = await getArtwork((await params).slug);
  if (!w) notFound();
  const [user, more] = await Promise.all([getSessionUser(), moreFromArtist(w.artist.slug, w.id)]);
  const price =
    w.availability === "AVAILABLE" && w.priceAmount && w.priceCurrency
      ? new Intl.NumberFormat("en", { style: "currency", currency: w.priceCurrency, maximumFractionDigits: 0 }).format(Number(w.priceAmount))
      : w.availability === "ON_REQUEST" || w.availability === "AVAILABLE"
        ? "Price on request"
        : null;
  const canInquire = w.availability === "AVAILABLE" || w.availability === "ON_REQUEST";

  const jsonLd = !w.isDemo
    ? { "@context": "https://schema.org", "@type": "VisualArtwork", name: w.title, creator: { "@type": "Person", name: w.artist.name }, dateCreated: w.year ? String(w.year) : undefined, artMedium: w.medium, size: w.dimensions ?? undefined }
    : null;

  return (
    <article>
      {w.isDemo && <DemoBanner label="DEMO — fictional artwork with a generated placeholder image." />}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-12 lg:py-14">
        {/* Art-first stage: true ratio, true colour, minimal chrome */}
        <div className="flex items-center justify-center bg-bg lg:min-h-[78vh]">
          <figure className="w-full" style={{ maxWidth: `min(100%, ${Math.round(78 * w.aspectRatio)}vh)` }}>
            <GenerativeArt seed={w.generativeSeed ?? 1} ratio={w.aspectRatio} title={w.title} className="shadow-[0_30px_80px_rgba(0,0,0,0.6)]" />
            <figcaption className="sr-only">{w.title} by {w.artist.name}</figcaption>
          </figure>
        </div>
        <aside className="lg:sticky lg:top-[100px] lg:self-start">
          <nav aria-label="Breadcrumb" className="mb-5 text-[12px] tracking-[0.14em] text-faint uppercase">
            <Link href="/art" className="hover:text-ink">Art</Link>
          </nav>
          <h1 className="display text-[clamp(2.25rem,4vw,3.25rem)] leading-tight">{w.title}</h1>
          <p className="mt-3 text-[17px]">
            <Link href={`/artists/${w.artist.slug}`} className="link-gold">{w.artist.name}</Link>
            <span className="text-muted">{w.year ? `, ${w.year}` : ""}</span>
          </p>
          <dl className="mt-8 space-y-3 border-t border-white/10 pt-6 text-[14px]">
            {[
              ["Medium", w.medium],
              ["Dimensions", w.dimensions],
              ["Edition", w.editionSize ? `${w.editionNumber ?? "—"} of ${w.editionSize}` : "Unique work"],
              ["Gallery", w.gallery?.name],
              ["Status", AVAILABILITY[w.availability]],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[110px_1fr] gap-3">
                  <dt className="eyebrow pt-0.5">{k}</dt>
                  <dd className="nums">{v}</dd>
                </div>
              ))}
          </dl>
          {price && <p className="display nums mt-8 text-[30px] text-gold-hover">{price}</p>}
          <div className="glass mt-6 p-6">
            {!canInquire ? (
              <p className="text-[14px] text-muted">This work isn&rsquo;t open for inquiries. See more from the artist below.</p>
            ) : user ? (
              <InquiryForm artworkId={w.id} title={w.title} />
            ) : (
              <>
                <p className="text-[14px] text-muted">Sign in to send an inquiry to the artist or gallery.</p>
                <Link href={`/sign-in?next=/art/${w.slug}`} className="btn btn-solid mt-4 w-full">Inquire</Link>
              </>
            )}
          </div>
          {w.provenance.length > 0 && (
            <section aria-labelledby="prov" className="mt-10">
              <h2 id="prov" className="eyebrow mb-5">Provenance & history</h2>
              <ol className="relative space-y-6 border-l border-[var(--gold-line)] pl-6">
                {w.provenance.map((p) => (
                  <li key={p.id} className="relative">
                    <span aria-hidden="true" className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-gold ring-4 ring-bg" />
                    <p className="text-[12px] tracking-[0.14em] text-gold-light uppercase">
                      {KIND[p.kind]} · <time dateTime={p.occurredOn.toISOString()}>{p.occurredOn.toLocaleDateString("en", { month: "short", year: "numeric" })}</time>
                    </p>
                    <p className="mt-1 text-[14px]">{p.description}</p>
                    {p.source && <p className="text-[12px] text-faint">Source: {p.source}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
      {more.length > 0 && (
        <Shelf eyebrow={w.artist.name} title="More from this artist" href={`/artists/${w.artist.slug}`}>
          {more.map((m) => (
            <div key={m.id} className="self-end">
              <ArtworkCard a={m} />
            </div>
          ))}
        </Shelf>
      )}
    </article>
  );
}
