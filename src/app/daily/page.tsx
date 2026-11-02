import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";
import { ArtHouseNav } from "@/components/art/ArtHouseNav";
import { DailyDeck, type DailyCard } from "@/components/daily/DailyDeck";
import { getSessionUser } from "@/lib/auth/session";
import { formatPrice } from "@/lib/art/assistant";
import { dailyPicks, savedArtworkIds } from "@/lib/queries/art";

export const metadata: Metadata = { title: "Discover Daily", description: "Ten works a day. Keep what moves you, skip what doesn't." };

export default async function DailyPage() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const [picks, user] = await Promise.all([dailyPicks(today), getSessionUser()]);
  const saved = user ? await savedArtworkIds(user.id, picks.map((p) => p.id)) : new Set<string>();
  const cards: DailyCard[] = picks.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    artist: a.artist.name,
    year: a.year,
    seed: a.generativeSeed ?? 1,
    ratio: a.aspectRatio,
    isDemo: a.isDemo,
    category: a.category,
    price: a.availability === "AVAILABLE" && a.priceAmount && a.priceCurrency ? formatPrice(Number(a.priceAmount), a.priceCurrency) : null,
  }));
  return (
    <>
      <PageHeader
        eyebrow="Art House"
        title="Discover Daily"
        intro="Ten works, chosen fresh each day. Keep what moves you — it trains your eye, and your saves become your collection."
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/art", label: "Art" },
          { href: "/daily", label: "Daily" },
        ]}
      >
        <ArtHouseNav current="/daily" />
      </PageHeader>
      <div className="px-4 py-10 sm:px-6">
        {cards.length === 0 ? <p className="text-center text-muted">No works to show yet.</p> : <DailyDeck cards={cards} signedIn={!!user} initialSaved={[...saved]} />}
      </div>
    </>
  );
}
