import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/directory";
import { ArtworkCard } from "@/components/cards";
import { ArtHouseNav } from "@/components/art/ArtHouseNav";
import { AutoSubmit } from "@/components/ui/AutoSubmit";
import { COLOR_FAMILIES } from "@/lib/art/color";
import { CATEGORIES } from "@/lib/art/generative";
import { artFilterSchema, filtersToSearch, PRICE_BANDS, searchArtworks } from "@/lib/queries/art";

export const metadata: Metadata = { title: "Art", description: "Artworks shown in true colour and proportion — browse by medium, colour, mood and price, then inquire directly with artists and galleries." };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const MOODS = ["calm", "bold", "playful", "minimal", "geometric", "cosmic", "dynamic", "warm", "cool", "dark", "light"];

export default async function ArtPage({ searchParams }: Props) {
  const raw = await searchParams;
  const one = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : undefined);
  const f = artFilterSchema.parse({ category: one("category"), color: one("color"), mood: one("mood"), availability: one("availability"), price: one("price"), sort: one("sort") });
  const works = await searchArtworks(filtersToSearch(f));
  const active = Object.values(f).some(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="Art House"
        title="The gallery wall"
        intro="Every work at its true proportions and true colour, never cropped. Browse by medium, colour and mood, then inquire directly with the artist or gallery."
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/art", label: "Art" },
        ]}
      >
        <ArtHouseNav current="/art" />
      </PageHeader>
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-12">
        <form id="art-filters" method="get" className="panel grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6" aria-label="Filter artworks">
          <div>
            <label htmlFor="f-category" className="label">
              Medium
            </label>
            <select id="f-category" name="category" className="field" defaultValue={f.category ?? ""}>
              <option value="">All media</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-color" className="label">
              Colour
            </label>
            <select id="f-color" name="color" className="field" defaultValue={f.color ?? ""}>
              <option value="">Any colour</option>
              {COLOR_FAMILIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-mood" className="label">
              Mood
            </label>
            <select id="f-mood" name="mood" className="field" defaultValue={f.mood ?? ""}>
              <option value="">Any mood</option>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m[0]!.toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-price" className="label">
              Price
            </label>
            <select id="f-price" name="price" className="field" defaultValue={f.price ?? ""}>
              <option value="">Any price</option>
              {Object.entries(PRICE_BANDS).map(([k, b]) => (
                <option key={k} value={k}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-availability" className="label">
              Availability
            </label>
            <select id="f-availability" name="availability" className="field" defaultValue={f.availability ?? ""}>
              <option value="">All works</option>
              <option value="available">For sale or on request</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-sort" className="label">
              Sort
            </label>
            <select id="f-sort" name="sort" className="field" defaultValue={f.sort ?? ""}>
              <option value="">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="year">Year made</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3 lg:col-span-6">
            <AutoSubmit formId="art-filters" />
            <div className="flex gap-2">
              {active && (
                <Link href="/art" className="btn btn-outline">
                  Clear
                </Link>
              )}
              <button type="submit" className="btn btn-solid">
                Apply
              </button>
            </div>
          </div>
        </form>
        <p className="mt-6 text-[13px] text-muted nums" aria-live="polite">
          {works.length} {works.length === 1 ? "work" : "works"}
          {f.price ? " · price filters show works with a published price" : ""}
        </p>
        {works.length === 0 ? (
          <div className="panel mt-6 p-10 text-center">
            <p className="display text-[24px]">Nothing matches all of those yet.</p>
            <p className="mt-2 text-[14px] text-muted">
              Loosen a filter, or describe what you want to the <Link href="/assistant" className="link-gold">Art Assistant</Link>.
            </p>
          </div>
        ) : (
          <div className="gallery-wall mt-6">
            {works.map((w) => (
              <ArtworkCard key={w.id} a={w} width="fluid" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
