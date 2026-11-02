import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/directory";
import { ArtworkCard } from "@/components/cards";
import { ArtHouseNav } from "@/components/art/ArtHouseNav";
import { describeQuery, parseArtQuery } from "@/lib/art/assistant";
import { searchArtworks } from "@/lib/queries/art";

export const metadata: Metadata = { title: "Art Assistant", description: "Describe the work you are looking for — in English or Bahasa Indonesia — and see matching artworks." };

const EXAMPLES = [
  "Lukisan biru yang tenang di bawah 20 juta",
  "Bold red and gold prints, cheapest first",
  "Karya hijau minimalis untuk kantor",
  "Playful colourful works that are available",
  "Dark cosmic digital art over 30 juta",
];

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function AssistantPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").slice(0, 200).trim();
  const parsed = q ? parseArtQuery(q) : null;
  const chips = parsed ? describeQuery(parsed) : [];
  const understood = !!parsed && chips.length > 0;
  // Exact match first; if nothing fits, relax the least important constraints one by one and say so.
  let works: Awaited<ReturnType<typeof searchArtworks>> = [];
  let relaxed: string | null = null;
  if (understood) {
    const base = { categories: parsed.categories, colorFamilies: parsed.colorFamilies, moods: parsed.moods, minPrice: parsed.minPrice, maxPrice: parsed.maxPrice, availableOnly: parsed.availableOnly, sort: parsed.sort, take: 24 };
    const steps: Array<[string | null, typeof base]> = [
      [null, base],
      ["mood", { ...base, moods: [] }],
      ["mood and price", { ...base, moods: [], minPrice: undefined, maxPrice: undefined }],
      ["mood, price and medium", { ...base, moods: [], minPrice: undefined, maxPrice: undefined, categories: [] }],
    ];
    for (const [label, q2] of steps) {
      if (label && q2.categories.length + q2.colorFamilies.length + q2.moods.length === 0 && q2.minPrice === undefined && q2.maxPrice === undefined) break;
      works = await searchArtworks(q2);
      if (works.length) {
        relaxed = label;
        break;
      }
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Art House"
        title="Art Assistant"
        intro="Describe what you are looking for — colour, mood, medium, budget — in English or Bahasa Indonesia. The assistant shows exactly how it read your words."
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/art", label: "Art" },
          { href: "/assistant", label: "Assistant" },
        ]}
      >
        <ArtHouseNav current="/assistant" />
      </PageHeader>
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-12">
        <form method="get" role="search" className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="as-q" className="label">
              What are you looking for?
            </label>
            <input id="as-q" name="q" defaultValue={q} maxLength={200} className="field" placeholder="e.g. lukisan biru yang tenang di bawah 20 juta" autoComplete="off" />
          </div>
          <button type="submit" className="btn btn-solid">
            Ask
          </button>
        </form>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Examples">
          {EXAMPLES.map((e) => (
            <li key={e}>
              <Link href={`/assistant?q=${encodeURIComponent(e)}`} className="inline-flex min-h-[36px] items-center rounded-full border border-white/10 px-3 text-[13px] text-muted hover:border-white/30 hover:text-ink">
                {e}
              </Link>
            </li>
          ))}
        </ul>

        {parsed && (
          <section aria-labelledby="as-read" className="mt-10">
            <h2 id="as-read" className="eyebrow mb-3">
              How I read it
            </h2>
            {understood ? (
              <ul className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <li key={c} className="chip border border-[var(--gold-line)] text-gold-light">
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-muted">I couldn&rsquo;t find a colour, mood, medium or price in that. Try one of the examples above.</p>
            )}
            {parsed.unmatched.length > 0 && <p className="mt-3 text-[13px] text-faint">Not used: {parsed.unmatched.join(", ")}</p>}
            {understood && (
              <>
                <p className="mt-6 text-[13px] text-muted nums" aria-live="polite">
                  {relaxed ? `No exact match — showing ${works.length} close ${works.length === 1 ? "match" : "matches"} without the ${relaxed} filter.` : `${works.length} ${works.length === 1 ? "match" : "matches"}`}
                </p>
                {works.length === 0 ? (
                  <p className="panel mt-4 p-8 text-center text-[15px] text-muted">
                    No works match every part of that yet. Try removing the price or mood, or <Link href="/art" className="link-gold">browse everything</Link>.
                  </p>
                ) : (
                  <div className="gallery-wall mt-4">
                    {works.map((w) => (
                      <ArtworkCard key={w.id} a={w} width="fluid" />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </>
  );
}
